require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const db = require('./db/database');
const { setupSocketIO } = require('./socket');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const anonymousRoutes = require('./routes/anonymous');
const adminAuthRoutes = require('./routes/admin-auth');
const registrationRoutes = require('./routes/registration');
const { expressAuth } = require('./middleware/auth');
const { limiter } = require('./middleware/rate-limit');

const app = express();
const server = http.createServer(app);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://localhost:3000,http://127.0.0.1:8080').split(',').map(s => s.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(limiter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'keymus-chat', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
// Anonymous session creation (no auth required)
app.use('/api/chat/anonymous', anonymousRoutes);

// Admin auth (login, setup — no auth required)
app.use('/api/admin/auth', adminAuthRoutes);

// Public registration (no auth required)
app.use('/api/register', registrationRoutes);

// Registration admin endpoints (admin auth handled inside the router)
app.use('/api/registrations', registrationRoutes);

// Admin routes (admin auth handled inside the router)
app.use('/api/admin/chat', adminRoutes);

// Client chat routes (requires auth)
app.use('/api/chat', expressAuth, chatRoutes);

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack || err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.CHAT_PORT || 3001;

async function start() {
    try {
        await db.initialize();
        console.log('✓ Database initialized');

        const io = setupSocketIO(server, allowedOrigins);
        app.set('io', io);
        console.log('✓ Socket.io initialized');

        server.listen(PORT, () => {
            console.log(`\n🚀 Keymus Chat Server running on port ${PORT}`);
            console.log(`   REST API:   http://localhost:${PORT}/api/chat`);
            console.log(`   WebSocket:  ws://localhost:${PORT}`);
            console.log(`   Health:     http://localhost:${PORT}/health\n`);
        });
    } catch (err) {
        console.error('✗ Failed to start chat server:', err);
        process.exit(1);
    }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    server.close();
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\nSIGINT received, shutting down...');
    server.close();
    await db.close();
    process.exit(0);
});

module.exports = { app, server };
