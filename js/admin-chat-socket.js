/**
 * Keymus Admin Chat Socket Bridge
 * Connects the admin chat panel to the /admin Socket.io namespace
 * Works alongside existing AdminChat / AdminChatAPI code
 *
 * Requires: chat-socket.js (KeymusChatSocket global)
 *
 * Usage:
 *   AdminChatSocketBridge.init();
 *   AdminChatSocketBridge.reply(conversationId, content, callback);
 *   AdminChatSocketBridge.on('newMessage', handler);
 */
const AdminChatSocketBridge = (function () {
    'use strict';

    // ── State ─────────────────────────────────────────────────────────────────
    let initialized = false;
    let conversations = [];
    let activeConversationId = null;
    let activeMessages = [];
    let stats = {};
    const handlers = new Map();

    // ── Initialize ────────────────────────────────────────────────────────────
    async function init() {
        if (initialized) return true;

        if (typeof KeymusChatSocket === 'undefined') {
            console.error('[AdminChatBridge] KeymusChatSocket not loaded');
            return false;
        }

        // Connect to admin namespace
        const connected = await KeymusChatSocket.connect('/admin');
        if (!connected) {
            console.error('[AdminChatBridge] Failed to connect to /admin namespace');
            return false;
        }

        // ── Listen for events from server ────────────────────────────────────
        KeymusChatSocket.on('admin:conversations', (data) => {
            conversations = data.conversations || [];
            _emit('conversationsUpdated', conversations);
        });

        KeymusChatSocket.on('admin:stats', (data) => {
            stats = data.stats || {};
            _emit('statsUpdated', stats);
        });

        KeymusChatSocket.on('admin:new-conversation', (data) => {
            conversations.unshift(data.conversation);
            _emit('newConversation', data);
            _emit('conversationsUpdated', conversations);
            // Play notification sound
            _playNotificationSound();
        });

        KeymusChatSocket.on('admin:new-message', (data) => {
            const msg = data.message;
            // Update conversations list with new last_message
            const conv = conversations.find(c => c.id === data.conversationId);
            if (conv) {
                conv.last_message = msg.content;
                conv.last_message_at = msg.created_at;
                conv.message_count = (parseInt(conv.message_count) || 0) + 1;
                // Move to top
                const idx = conversations.indexOf(conv);
                if (idx > 0) {
                    conversations.splice(idx, 1);
                    conversations.unshift(conv);
                }
            }

            // Add to active messages if viewing this conversation
            if (activeConversationId === data.conversationId) {
                activeMessages.push(msg);
                _emit('newMessage', msg);
            }

            _emit('conversationsUpdated', conversations);
            _playNotificationSound();
        });

        KeymusChatSocket.on('admin:conversation-resolved', (data) => {
            conversations = conversations.filter(c => c.id !== data.conversationId);
            _emit('conversationResolved', data.conversationId);
            _emit('conversationsUpdated', conversations);
        });

        KeymusChatSocket.on('admin:conversation-reopened', (data) => {
            _emit('conversationReopened', data.conversationId);
            refresh();
        });

        KeymusChatSocket.on('admin:user-typing', (data) => {
            _emit('userTyping', data);
        });

        KeymusChatSocket.on('admin:user-stop-typing', (data) => {
            _emit('userStopTyping', data);
        });

        KeymusChatSocket.on('admin:user-offline', (data) => {
            const conv = conversations.find(c => c.created_by === data.userId);
            if (conv) {
                conv.creator_is_online = false;
                _emit('conversationsUpdated', conversations);
            }
        });

        KeymusChatSocket.on('connection-status', (data) => {
            _emit('connectionStatus', data);
        });

        initialized = true;
        console.log('[AdminChatBridge] Initialized');
        return true;
    }

    // ── View Conversation ─────────────────────────────────────────────────────
    async function viewConversation(conversationId, callback) {
        activeConversationId = conversationId;
        activeMessages = [];

        // Ensure connected
        if (!KeymusChatSocket.isConnected()) {
            await waitForConnection();
        }

        KeymusChatSocket.send('admin:view-conversation', {
            conversationId
        }, (response) => {
            if (response.success) {
                activeMessages = response.messages || [];
                _emit('messagesLoaded', {
                    conversation: response.conversation,
                    messages: activeMessages
                });
            }
            if (callback) callback(response);
        });
    }

    // ── Reply to Conversation ─────────────────────────────────────────────────
    function reply(conversationId, content, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        KeymusChatSocket.send('admin:reply', {
            conversationId,
            content,
            contentType: options?.contentType || 'text',
            personaName: options?.personaName || null
        }, (response) => {
            if (response.success && response.message) {
                // Add to active messages if viewing this conversation
                if (activeConversationId === conversationId) {
                    activeMessages.push(response.message);
                }
            }
            if (callback) callback(response);
        });
    }

    // ── Resolve Conversation ──────────────────────────────────────────────────
    function resolve(conversationId, callback) {
        KeymusChatSocket.send('admin:resolve', { conversationId }, (response) => {
            if (callback) callback(response);
        });
    }

    // ── Reopen Conversation ───────────────────────────────────────────────────
    function reopen(conversationId, callback) {
        KeymusChatSocket.send('admin:reopen', { conversationId }, (response) => {
            if (callback) callback(response);
        });
    }

    // ── Typing Indicators ─────────────────────────────────────────────────────
    function sendTyping(conversationId) {
        KeymusChatSocket.send('admin:typing', { conversationId });
    }

    function sendStopTyping(conversationId) {
        KeymusChatSocket.send('admin:stop-typing', { conversationId });
    }

    // ── Refresh ───────────────────────────────────────────────────────────────
    function refresh(callback) {
        if (!KeymusChatSocket.isConnected()) {
            console.warn('[AdminChatBridge] Not connected, waiting before refresh...');
            waitForConnection().then(() => {
                KeymusChatSocket.send('admin:refresh', (response) => {
                    if (response.success) {
                        conversations = response.conversations || [];
                        _emit('conversationsUpdated', conversations);
                    }
                    if (callback) callback(response);
                });
            });
            return;
        }
        
        KeymusChatSocket.send('admin:refresh', (response) => {
            if (response.success) {
                conversations = response.conversations || [];
                _emit('conversationsUpdated', conversations);
            }
            if (callback) callback(response);
        });
    }

    // ── Wait for Connection ───────────────────────────────────────────────────
    function waitForConnection(timeout = 5000) {
        return new Promise((resolve) => {
            if (KeymusChatSocket.isConnected()) {
                resolve(true);
                return;
            }

            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (KeymusChatSocket.isConnected()) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (Date.now() - startTime >= timeout) {
                    clearInterval(checkInterval);
                    console.warn('[AdminChatBridge] Connection timeout');
                    resolve(false);
                }
            }, 100);
        });
    }

    // ── Event System ──────────────────────────────────────────────────────────
    function on(event, handler) {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event).add(handler);
    }

    function off(event, handler) {
        if (handlers.has(event)) {
            if (handler) handlers.get(event).delete(handler);
            else handlers.delete(event);
        }
    }

    function _emit(event, data) {
        const eventHandlers = handlers.get(event);
        if (eventHandlers) {
            eventHandlers.forEach(h => {
                try { h(data); } catch (e) { console.error('[AdminChatBridge] Event handler error:', e); }
            });
        }
    }

    // ── Notification Sound ────────────────────────────────────────────────────
    function _playNotificationSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.stop(audioCtx.currentTime + 0.3);
        } catch (e) { /* audio not available */ }
    }

    // ── Getters ───────────────────────────────────────────────────────────────
    function getConversations() { return conversations; }
    function getActiveMessages() { return activeMessages; }
    function getActiveConversationId() { return activeConversationId; }
    function getStats() { return stats; }
    function isInitialized() { return initialized; }
    function isConnected() { return KeymusChatSocket.isConnected(); }

    // ── Disconnect ────────────────────────────────────────────────────────────
    function disconnect() {
        KeymusChatSocket.disconnect();
        initialized = false;
        conversations = [];
        activeMessages = [];
        activeConversationId = null;
    }

    // ── Public API ────────────────────────────────────────────────────────────
    return {
        init,
        viewConversation,
        reply,
        resolve,
        reopen,
        sendTyping,
        sendStopTyping,
        refresh,
        waitForConnection,
        on,
        off,
        disconnect,
        getConversations,
        getActiveMessages,
        getActiveConversationId,
        getStats,
        isInitialized,
        isConnected
    };
})();

// Export as both names for compatibility
window.AdminChatSocketBridge = AdminChatSocketBridge;
window.AdminChatSocket = AdminChatSocketBridge; // Alias for convenience

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminChatSocketBridge;
}
