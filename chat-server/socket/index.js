/**
 * Keymus Chat — Socket.io Setup
 * Initializes WebSocket server with /chat and /admin namespaces
 */
const { Server } = require('socket.io');
const { socketAuth, socketAdminAuth } = require('../middleware/auth');
const setupChatNamespace = require('./chat-namespace');
const setupAdminNamespace = require('./admin-namespace');

function setupSocketIO(server, allowedOrigins) {
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
        maxHttpBufferSize: 1e6 // 1MB max message size
    });

    // ── /chat namespace — for regular users ──────────────────────────────────
    const chatNsp = io.of('/chat');
    chatNsp.use(socketAuth);
    setupChatNamespace(chatNsp);

    // ── /admin namespace — for admin users only ──────────────────────────────
    const adminNsp = io.of('/admin');
    adminNsp.use(socketAdminAuth);
    setupAdminNamespace(adminNsp, chatNsp);

    // Connection logging
    io.engine.on('connection_error', (err) => {
        console.warn('Socket.io connection error:', err.message);
    });

    console.log('  Socket.io namespaces: /chat, /admin');

    return io;
}

module.exports = { setupSocketIO };
