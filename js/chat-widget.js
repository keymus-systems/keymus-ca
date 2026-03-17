/**
 * Keymus Chat Widget
 * Self-contained floating chat button + inline chat panel
 * Requires: chat-socket.js (KeymusChatSocket global)
 *
 * Auto-initializes on DOM load. If the user is not logged in,
 * an anonymous guest session is created transparently.
 */
(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────────────────────
    const CONFIG = {
        welcomeTitle: 'Hi there! 👋',
        welcomeText: 'How can we help you today? Send us a message and we\'ll get back to you shortly.',
        headerTitle: 'Keymus Support',
        headerSubtitle: 'Usually replies within minutes',
        inputPlaceholder: 'Type a message...',
        cssPath: 'css/chat-panel.css'
    };

    // ── State ─────────────────────────────────────────────────────────────────
    let isOpen = false;
    let isInitialized = false;
    let isLoading = false;
    let conversation = null;
    let messages = [];
    let currentUserId = null;
    let unreadCount = 0;
    let typingTimeout = null;
    let isUserTyping = false;

    // ── DOM Refs ──────────────────────────────────────────────────────────────
    let widget, panel, msgContainer, inputField, sendBtn, badge, statusBar, typingIndicator;

    // ── Inject CSS ────────────────────────────────────────────────────────────
    function injectCSS() {
        if (document.querySelector('link[href*="chat-panel"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CONFIG.cssPath;
        document.head.appendChild(link);
    }

    // ── Build DOM ─────────────────────────────────────────────────────────────
    function buildWidget() {
        if (document.getElementById('keymus-chat-widget')) return;

        // Floating button
        widget = document.createElement('div');
        widget.id = 'keymus-chat-widget';
        widget.className = 'keymus-chat-widget';
        widget.innerHTML = `
            <button class="keymus-chat-btn" aria-label="Open chat">
                <i class="fas fa-comments chat-icon"></i>
                <i class="fas fa-times close-icon"></i>
                <span class="keymus-chat-badge" id="keymusChatBadge">0</span>
            </button>
        `;

        // Chat panel
        panel = document.createElement('div');
        panel.id = 'keymus-chat-panel';
        panel.className = 'keymus-chat-panel';
        panel.innerHTML = `
            <div class="keymus-chat-header">
                <div class="keymus-chat-header-avatar">
                    <i class="fas fa-headset"></i>
                </div>
                <div class="keymus-chat-header-info">
                    <p class="keymus-chat-header-title">${CONFIG.headerTitle}</p>
                    <p class="keymus-chat-header-subtitle">${CONFIG.headerSubtitle}</p>
                </div>
            </div>
            <div class="keymus-chat-status" id="keymusChatStatus"></div>
            <div class="keymus-chat-messages" id="keymusChatMessages">
                <div class="keymus-chat-welcome">
                    <div class="keymus-chat-welcome-icon">💬</div>
                    <h4>${CONFIG.welcomeTitle}</h4>
                    <p>${CONFIG.welcomeText}</p>
                </div>
            </div>
            <div class="keymus-typing-indicator" id="keymusTypingIndicator">
                <span class="keymus-typing-dot"></span>
                <span class="keymus-typing-dot"></span>
                <span class="keymus-typing-dot"></span>
            </div>
            <div class="keymus-chat-input-area">
                <textarea class="keymus-chat-input" id="keymusChatInput"
                          placeholder="${CONFIG.inputPlaceholder}"
                          rows="1" maxlength="2000"></textarea>
                <button class="keymus-chat-send-btn" id="keymusChatSend" disabled aria-label="Send message">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;

        document.body.appendChild(widget);
        document.body.appendChild(panel);

        // Cache refs
        badge = document.getElementById('keymusChatBadge');
        msgContainer = document.getElementById('keymusChatMessages');
        inputField = document.getElementById('keymusChatInput');
        sendBtn = document.getElementById('keymusChatSend');
        statusBar = document.getElementById('keymusChatStatus');
        typingIndicator = document.getElementById('keymusTypingIndicator');

        // ── Event Listeners ──────────────────────────────────────────────────
        widget.querySelector('.keymus-chat-btn').addEventListener('click', togglePanel);

        sendBtn.addEventListener('click', sendMessage);

        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        inputField.addEventListener('input', () => {
            // Auto-resize textarea
            inputField.style.height = 'auto';
            inputField.style.height = Math.min(inputField.scrollHeight, 100) + 'px';
            // Enable/disable send
            sendBtn.disabled = !inputField.value.trim();
            // Typing indicator
            handleTyping();
        });
    }

    // ── Toggle Panel ──────────────────────────────────────────────────────────
    async function togglePanel() {
        isOpen = !isOpen;
        widget.classList.toggle('open', isOpen);
        panel.classList.toggle('open', isOpen);

        if (isOpen && !isInitialized) {
            await initChat();
        }

        if (isOpen) {
            inputField.focus();
            markAsRead();
            updateBadge(0);
        }
    }

    // ── Helper: Wait for Connection ──────────────────────────────────────────
    function waitForConnection(timeout = 5000) {
        return new Promise((resolve, reject) => {
            // Check if already connected
            if (KeymusChatSocket.isConnected && KeymusChatSocket.isConnected()) {
                resolve();
                return;
            }

            let timeoutId;
            const checkConnection = () => {
                if (KeymusChatSocket.isConnected && KeymusChatSocket.isConnected()) {
                    clearTimeout(timeoutId);
                    KeymusChatSocket.off('connection-status', checkConnection);
                    resolve();
                }
            };

            // Listen for connection
            KeymusChatSocket.on('connection-status', checkConnection);

            // Timeout after 5 seconds
            timeoutId = setTimeout(() => {
                KeymusChatSocket.off('connection-status', checkConnection);
                resolve(); // Resolve anyway to allow fallback to REST
            }, timeout);
        });
    }

    // ── Initialize Chat ───────────────────────────────────────────────────────
    async function initChat() {
        if (isInitialized || isLoading) return;
        isLoading = true;
        showLoading();

        try {
            // Ensure we have auth (creates anonymous session if needed)
            const hasAuth = await KeymusChatSocket.ensureAuth();
            if (!hasAuth) {
                showError('Unable to start chat. Please try again.');
                return;
            }

            // Extract current user ID from token
            try {
                const token = KeymusChatSocket.getToken();
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    currentUserId = payload.id;
                }
            } catch (e) { /* ignore token parse errors */ }

            // Connect to Socket.io
            await KeymusChatSocket.connect('/chat');

            // Set up event handlers
            KeymusChatSocket.on('chat:new-message', handleNewMessage);
            KeymusChatSocket.on('chat:typing', handleRemoteTyping);
            KeymusChatSocket.on('chat:stop-typing', handleRemoteStopTyping);
            KeymusChatSocket.on('chat:conversation-resolved', handleConversationResolved);
            KeymusChatSocket.on('connection-status', handleConnectionStatus);
            KeymusChatSocket.on('chat:unread-count', handleUnreadCount);

            // Wait for connection before sending messages
            await waitForConnection();

            // Get or create a support conversation
            KeymusChatSocket.send('chat:get-or-create-conversation', {
                subject: 'Support Chat'
            }, (response) => {
                if (response.error) {
                    showError('Failed to start conversation. Please try again.');
                    isLoading = false;
                    return;
                }

                conversation = response.conversation;
                messages = response.messages || [];
                isInitialized = true;
                isLoading = false;
                renderMessages();
            });
        } catch (err) {
            console.error('[ChatWidget] Init failed:', err);
            showError('Connection failed. Please try again.');
            isLoading = false;
        }
    }

    // ── Render Messages ───────────────────────────────────────────────────────
    function renderMessages() {
        if (!msgContainer) return;

        if (messages.length === 0) {
            msgContainer.innerHTML = `
                <div class="keymus-chat-welcome">
                    <div class="keymus-chat-welcome-icon">💬</div>
                    <h4>${CONFIG.welcomeTitle}</h4>
                    <p>${CONFIG.welcomeText}</p>
                </div>
            `;
            return;
        }

        msgContainer.innerHTML = '';
        messages.forEach(msg => appendMessageElement(msg));
        scrollToBottom();
    }

    function appendMessageElement(msg) {
        const div = document.createElement('div');

        if (msg.content_type === 'system') {
            div.className = 'keymus-msg keymus-msg-system';
            div.textContent = msg.content;
        } else {
            const isMine = msg.sender_id === currentUserId;
            div.className = `keymus-msg ${isMine ? 'keymus-msg-sent' : 'keymus-msg-received'}`;

            let senderHtml = '';
            if (!isMine && msg.sender_name) {
                senderHtml = `<div class="keymus-msg-sender">${escapeHtml(msg.persona_name || msg.sender_name)}</div>`;
            }

            const timeStr = formatTime(msg.created_at);
            div.innerHTML = `
                ${senderHtml}
                <div class="keymus-msg-content">${escapeHtml(msg.content)}</div>
                <div class="keymus-msg-time">${timeStr}</div>
            `;
        }

        msgContainer.appendChild(div);
    }

    // ── Send Message ──────────────────────────────────────────────────────────
    function sendMessage() {
        const content = inputField.value.trim();
        if (!content || !conversation) return;

        // Optimistic UI: show message immediately
        const optimisticMsg = {
            id: 'temp_' + Date.now(),
            conversation_id: conversation.id,
            sender_id: currentUserId,
            content,
            content_type: 'text',
            created_at: new Date().toISOString()
        };
        messages.push(optimisticMsg);
        appendMessageElement(optimisticMsg);
        scrollToBottom();

        // Clear input
        inputField.value = '';
        inputField.style.height = 'auto';
        sendBtn.disabled = true;

        // Send via Socket.io
        KeymusChatSocket.send('chat:send', {
            conversationId: conversation.id,
            content,
            contentType: 'text'
        }, (response) => {
            if (response.error) {
                console.error('[ChatWidget] Send failed:', response.error);
                // Mark optimistic message as failed
                const el = msgContainer.lastElementChild;
                if (el) {
                    el.style.opacity = '0.5';
                    el.title = 'Failed to send. Click to retry.';
                }
            }
        });

        // Stop typing indicator
        if (isUserTyping) {
            KeymusChatSocket.send('chat:stop-typing', { conversationId: conversation.id });
            isUserTyping = false;
        }
    }

    // ── Handle Incoming Message ───────────────────────────────────────────────
    function handleNewMessage(data) {
        if (!data || !data.message) return;
        const msg = data.message;

        // Only process messages for our conversation
        if (conversation && msg.conversation_id !== conversation.id) return;

        // Skip if this is our own message (already shown optimistically)
        if (msg.sender_id === currentUserId) {
            // Replace optimistic message with real one
            const tempIdx = messages.findIndex(m => m.id && m.id.startsWith('temp_'));
            if (tempIdx !== -1) {
                messages[tempIdx] = msg;
            }
            return;
        }

        messages.push(msg);
        appendMessageElement(msg);
        scrollToBottom();

        // If panel is open, mark as read
        if (isOpen) {
            markAsRead();
        } else {
            unreadCount++;
            updateBadge(unreadCount);
            // Browser notification
            if (Notification.permission === 'granted') {
                new Notification('Keymus Support', {
                    body: msg.content.substring(0, 100),
                    icon: 'assets/uploads/keymus/keymus-logo.jpg'
                });
            }
        }

        // Hide typing indicator when message arrives
        if (typingIndicator) {
            typingIndicator.classList.remove('visible');
        }
    }

    // ── Typing Indicators ─────────────────────────────────────────────────────
    function handleTyping() {
        if (!conversation) return;

        if (!isUserTyping) {
            isUserTyping = true;
            KeymusChatSocket.send('chat:typing', { conversationId: conversation.id });
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isUserTyping = false;
            KeymusChatSocket.send('chat:stop-typing', { conversationId: conversation.id });
        }, 2000);
    }

    function handleRemoteTyping(data) {
        if (!conversation || data.conversationId !== conversation.id) return;
        if (data.userId === currentUserId) return;
        if (typingIndicator) {
            typingIndicator.classList.add('visible');
            scrollToBottom();
        }
    }

    function handleRemoteStopTyping(data) {
        if (!conversation || data.conversationId !== conversation.id) return;
        if (typingIndicator) {
            typingIndicator.classList.remove('visible');
        }
    }

    // ── Conversation Resolved ─────────────────────────────────────────────────
    function handleConversationResolved(data) {
        if (!conversation || data.conversationId !== conversation.id) return;
        const sysMsg = {
            id: 'sys_' + Date.now(),
            content_type: 'system',
            content: 'This conversation has been resolved. Start a new message if you need more help.',
            created_at: new Date().toISOString()
        };
        messages.push(sysMsg);
        appendMessageElement(sysMsg);
        scrollToBottom();
        conversation = null;
        isInitialized = false;
    }

    // ── Connection Status ─────────────────────────────────────────────────────
    function handleConnectionStatus(data) {
        if (!statusBar) return;
        statusBar.className = 'keymus-chat-status ' + data.status;
        switch (data.status) {
            case 'connected':
                statusBar.textContent = '● Connected';
                break;
            case 'disconnected':
                statusBar.textContent = '● Reconnecting...';
                break;
            case 'polling':
                statusBar.textContent = '● Using backup connection';
                break;
            case 'error':
                statusBar.textContent = '● Connection issue — retrying...';
                break;
            default:
                statusBar.textContent = '';
        }
    }

    function handleUnreadCount(data) {
        if (!isOpen && data.count > 0) {
            unreadCount = data.count;
            updateBadge(unreadCount);
        }
    }

    // ── Mark as Read ──────────────────────────────────────────────────────────
    function markAsRead() {
        if (conversation) {
            KeymusChatSocket.send('chat:read', { conversationId: conversation.id });
        }
        unreadCount = 0;
        updateBadge(0);
    }

    // ── Badge ─────────────────────────────────────────────────────────────────
    function updateBadge(count) {
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.add('visible');
        } else {
            badge.classList.remove('visible');
        }
    }

    // ── UI Helpers ────────────────────────────────────────────────────────────
    function scrollToBottom() {
        if (msgContainer) {
            requestAnimationFrame(() => {
                msgContainer.scrollTop = msgContainer.scrollHeight;
            });
        }
    }

    function showLoading() {
        if (msgContainer) {
            msgContainer.innerHTML = `
                <div class="keymus-chat-loading">
                    <div class="keymus-chat-loading-dot"></div>
                    <div class="keymus-chat-loading-dot"></div>
                    <div class="keymus-chat-loading-dot"></div>
                </div>
            `;
        }
    }

    function showError(message) {
        if (msgContainer) {
            msgContainer.innerHTML = `
                <div class="keymus-chat-welcome">
                    <div class="keymus-chat-welcome-icon">⚠️</div>
                    <h4>Connection Issue</h4>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatTime(dateStr) {
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const isToday = d.toDateString() === now.toDateString();

            if (isToday) {
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' '
                 + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    // ── Notification Permission Request ───────────────────────────────────────
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Ask after user sends first message
            Notification.requestPermission();
        }
    }

    // ── Legacy Compatibility ──────────────────────────────────────────────────
    // Keep old function names so external code doesn't break
    window.createChatWidget = function () { buildWidget(); };
    window.openChatPage = function () { if (!isOpen) togglePanel(); };
    window.updateChatWidgetBadge = function () { /* handled via socket now */ };

    // ── Initialize ────────────────────────────────────────────────────────────
    function init() {
        injectCSS();
        buildWidget();
        requestNotificationPermission();

        // Listen for visibility change to mark messages as read
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && isOpen) {
                markAsRead();
            }
        });

        // If user logs in after widget loads, try upgrading guest session
        window.addEventListener('storage', (e) => {
            if (e.key === 'auth_token' && e.newValue && localStorage.getItem('chat_token')) {
                KeymusChatSocket.upgradeGuestSession(e.newValue);
            }
        });
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
