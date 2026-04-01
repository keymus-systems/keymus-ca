/**
 * Keymus Chat Socket Client
 * Shared Socket.io connection wrapper for real-time chat
 *
 * Provides:
 *  - Auto-loading of Socket.io client from CDN
 *  - Unified token resolution from all auth systems
 *  - Anonymous session auto-creation
 *  - WebSocket connection with auto-reconnect
 *  - 5-second REST fallback polling when WebSocket is down
 *
 * Usage:
 *   await KeymusChatSocket.connect('/chat');
 *   KeymusChatSocket.on('chat:new-message', (data) => { ... });
 *   KeymusChatSocket.send('chat:send', { conversationId, content }, callback);
 */
const KeymusChatSocket = (function () {
    // ── Config ────────────────────────────────────────────────────────────────
    const CHAT_SERVER_URL = window.KEYMUS_CHAT_URL || 'http://localhost:3001';
    const SOCKET_IO_CDN = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
    const POLL_INTERVAL = 5000;

    // ── State ─────────────────────────────────────────────────────────────────
    let socket = null;
    let connected = false;
    let namespace = '/chat';
    let pollTimer = null;
    let lastPollTimestamp = null;
    let eventHandlers = new Map();

    // ── Load Socket.io client dynamically ─────────────────────────────────────
    function loadSocketIO() {
        return new Promise((resolve, reject) => {
            if (typeof io !== 'undefined') {
                return resolve();
            }
            const existing = document.querySelector(`script[src*="socket.io"]`);
            if (existing) {
                existing.addEventListener('load', resolve);
                existing.addEventListener('error', reject);
                return;
            }
            const script = document.createElement('script');
            script.src = SOCKET_IO_CDN;
            script.crossOrigin = 'anonymous';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Socket.io client'));
            document.head.appendChild(script);
        });
    }

    // ── Token Resolution ──────────────────────────────────────────────────────
    function getToken() {
        try {
            if (namespace === '/admin') {
                if (typeof DualAuth !== 'undefined') {
                    const t = DualAuth.getToken('admin');
                    if (t) return t;
                }
                return localStorage.getItem('admin_auth_token')
                    || localStorage.getItem('auth_token_admin')
                    || localStorage.getItem('auth_token');
            }
            // Client namespace — never use an admin-role token for /chat
            function _isAdminToken(t) {
                try {
                    const p = JSON.parse(atob(t.split('.')[1]));
                    return p.role === 'admin';
                } catch (e) { return false; }
            }

            if (typeof DualAuth !== 'undefined') {
                const t = DualAuth.getToken('client');
                if (t && !_isAdminToken(t)) return t;
            }
            if (typeof SimpleAuth !== 'undefined' && SimpleAuth.getToken) {
                const t = SimpleAuth.getToken();
                if (t && !_isAdminToken(t)) return t;
            }
            // Check localStorage candidates, skipping admin tokens
            const candidates = [
                localStorage.getItem('auth_token_client'),
                localStorage.getItem('chat_token'),
                localStorage.getItem('auth_token')
            ];
            for (const t of candidates) {
                if (t && !_isAdminToken(t)) return t;
            }
            return null;
        } catch (e) {
            return localStorage.getItem('chat_token');
        }
    }

    function hasAuth() {
        return !!getToken();
    }

    // ── Anonymous Session ─────────────────────────────────────────────────────
    async function ensureAuth() {
        if (hasAuth()) return true;

        try {
            const resp = await fetch(`${CHAT_SERVER_URL}/api/chat/anonymous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const data = await resp.json();
            if (data.token) {
                localStorage.setItem('chat_token', data.token);
                localStorage.setItem('chat_user', JSON.stringify(data.user));
                return true;
            }
            return false;
        } catch (err) {
            console.error('[ChatSocket] Anonymous session failed:', err);
            return false;
        }
    }

    // ── Upgrade guest to registered user ──────────────────────────────────────
    async function upgradeGuestSession(registeredToken) {
        const guestToken = localStorage.getItem('chat_token');
        if (!guestToken) return false;

        try {
            const resp = await fetch(`${CHAT_SERVER_URL}/api/chat/anonymous/upgrade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guestToken, registeredToken })
            });

            if (resp.ok) {
                localStorage.removeItem('chat_token');
                localStorage.removeItem('chat_user');
                return true;
            }
            return false;
        } catch (err) {
            console.error('[ChatSocket] Upgrade failed:', err);
            return false;
        }
    }

    // ── Connect ───────────────────────────────────────────────────────────────
    async function connect(ns) {
        namespace = ns || '/chat';

        try {
            await loadSocketIO();
        } catch (err) {
            console.error('[ChatSocket] Socket.io load failed, using polling:', err);
            startFallbackPolling();
            return false;
        }

        const token = getToken();
        if (!token) {
            console.warn('[ChatSocket] No auth token available');
            return false;
        }

        // Disconnect existing socket
        if (socket) {
            socket.disconnect();
            socket = null;
        }

        socket = io(CHAT_SERVER_URL + namespace, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 20,
            timeout: 10000
        });

        // Re-register existing event handlers on the new socket
        for (const [event, handlers] of eventHandlers) {
            if (event === 'connection-status') continue; // Internal event
            for (const handler of handlers) {
                socket.on(event, handler);
            }
        }

        socket.on('connect', () => {
            connected = true;
            stopFallbackPolling();
            _emitLocal('connection-status', { status: 'connected' });
            console.log(`[ChatSocket] Connected to ${namespace}`);
        });

        socket.on('disconnect', (reason) => {
            connected = false;
            _emitLocal('connection-status', { status: 'disconnected', reason });
            console.log(`[ChatSocket] Disconnected: ${reason}`);
            if (reason !== 'io client disconnect') {
                startFallbackPolling();
            }
        });

        socket.on('connect_error', (err) => {
            console.warn(`[ChatSocket] Connection error: ${err.message}`);
            _emitLocal('connection-status', { status: 'error', error: err.message });
            if (!pollTimer) {
                startFallbackPolling();
            }
        });

        return true;
    }

    // ── Disconnect ────────────────────────────────────────────────────────────
    function disconnect() {
        stopFallbackPolling();
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        connected = false;
        _emitLocal('connection-status', { status: 'disconnected', reason: 'manual' });
    }

    // ── Send (emit via socket) ────────────────────────────────────────────────
    function send(event, data, callback) {
        if (socket && socket.connected) {
            socket.emit(event, data, callback);
        } else {
            console.warn('[ChatSocket] Not connected, cannot send:', event);
            if (callback) callback({ error: 'Not connected' });
        }
    }

    // ── Event Subscription ────────────────────────────────────────────────────
    function on(event, handler) {
        if (!eventHandlers.has(event)) {
            eventHandlers.set(event, new Set());
        }
        eventHandlers.get(event).add(handler);

        // If socket exists, also register on it
        if (socket && event !== 'connection-status') {
            socket.on(event, handler);
        }
    }

    function off(event, handler) {
        if (eventHandlers.has(event)) {
            if (handler) {
                eventHandlers.get(event).delete(handler);
            } else {
                eventHandlers.delete(event);
            }
        }
        if (socket && event !== 'connection-status') {
            if (handler) {
                socket.off(event, handler);
            } else {
                socket.removeAllListeners(event);
            }
        }
    }

    // Emit to local handlers only (not via socket)
    function _emitLocal(event, data) {
        const handlers = eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(h => {
                try { h(data); } catch (e) { console.error('[ChatSocket] Handler error:', e); }
            });
        }
    }

    // ── Fallback Polling ──────────────────────────────────────────────────────
    function startFallbackPolling() {
        if (pollTimer) return;
        lastPollTimestamp = lastPollTimestamp || new Date().toISOString();
        console.log('[ChatSocket] Starting 5s fallback polling');

        pollTimer = setInterval(async () => {
            // Stop polling if socket reconnected
            if (socket && socket.connected) {
                stopFallbackPolling();
                return;
            }

            try {
                const token = getToken();
                if (!token) return;

                const isAdmin = namespace === '/admin';
                const endpoint = isAdmin
                    ? `${CHAT_SERVER_URL}/api/admin/chat/poll?since=${encodeURIComponent(lastPollTimestamp)}`
                    : `${CHAT_SERVER_URL}/api/chat/poll?since=${encodeURIComponent(lastPollTimestamp)}`;

                const resp = await fetch(endpoint, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!resp.ok) return;

                const data = await resp.json();
                lastPollTimestamp = data.timestamp;

                // Emit polled messages through local handlers
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        const event = isAdmin ? 'admin:new-message' : 'chat:new-message';
                        _emitLocal(event, { message: msg, conversationId: msg.conversation_id });
                    });
                }

                if (data.unread !== undefined) {
                    _emitLocal('chat:unread-count', { count: data.unread });
                }

                _emitLocal('connection-status', { status: 'polling' });
            } catch (err) {
                // Silently fail polling
            }
        }, POLL_INTERVAL);
    }

    function stopFallbackPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────
    return {
        connect,
        disconnect,
        send,
        on,
        off,
        hasAuth,
        ensureAuth,
        upgradeGuestSession,
        getToken,
        getSocket: () => socket,
        isConnected: () => connected,
        getServerUrl: () => CHAT_SERVER_URL
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeymusChatSocket;
}
