/**
 * Keymus Chat — Admin Auth Routes
 * Handles admin login, registration of the first admin, and session check.
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db/database');
const { signToken, verifyToken } = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rate-limit');

const SALT_ROUNDS = 12;

// ── POST /api/admin/auth/login ────────────────────────────────────────────────
// Admin login with username + password
router.post('/login', strictLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find admin user (case-insensitive username match)
        const admin = await db.getOne(
            'SELECT * FROM admin_users WHERE LOWER(username) = $1 AND is_active = TRUE',
            [username.toLowerCase().trim()]
        );

        if (!admin) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, admin.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Update last login
        await db.query(
            'UPDATE admin_users SET last_login_at = NOW() WHERE id = $1',
            [admin.id]
        );

        // Upsert into chat_users so admin can participate in conversations
        await db.query(`
            INSERT INTO chat_users (id, display_name, email, is_guest, is_admin, is_online)
            VALUES ($1, $2, $3, FALSE, TRUE, TRUE)
            ON CONFLICT (id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                is_admin = TRUE,
                is_online = TRUE,
                last_seen_at = NOW()
        `, [admin.id, admin.display_name, admin.email]);

        // Generate JWT
        const token = signToken({
            id: admin.id,
            displayName: admin.display_name,
            email: admin.email,
            role: 'admin',
            isGuest: false,
            isAdmin: true
        }, '24h');

        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                displayName: admin.display_name,
                email: admin.email
            }
        });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ── POST /api/admin/auth/setup ────────────────────────────────────────────────
// Create the first admin account (only works when no admins exist)
router.post('/setup', strictLimiter, async (req, res) => {
    try {
        // Check if any admin already exists
        const existing = await db.getOne('SELECT COUNT(*)::int AS count FROM admin_users');
        if (existing.count > 0) {
            return res.status(403).json({ error: 'Admin account already exists. Use login instead.' });
        }

        const { username, password, displayName, email } = req.body;

        if (!username || !password || !displayName) {
            return res.status(400).json({ error: 'Username, password, and display name are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create admin user
        const adminId = 'admin_' + require('crypto').randomBytes(4).toString('hex');
        await db.query(`
            INSERT INTO admin_users (id, username, password_hash, display_name, email)
            VALUES ($1, $2, $3, $4, $5)
        `, [adminId, username.toLowerCase().trim(), passwordHash, displayName, email || null]);

        // Also create in chat_users
        await db.query(`
            INSERT INTO chat_users (id, display_name, email, is_guest, is_admin, is_online)
            VALUES ($1, $2, $3, FALSE, TRUE, FALSE)
            ON CONFLICT (id) DO NOTHING
        `, [adminId, displayName, email || null]);

        // Generate JWT
        const token = signToken({
            id: adminId,
            displayName,
            email: email || null,
            role: 'admin',
            isGuest: false,
            isAdmin: true
        }, '24h');

        res.json({
            success: true,
            message: 'Admin account created successfully',
            token,
            admin: {
                id: adminId,
                username: username.toLowerCase().trim(),
                displayName,
                email
            }
        });
    } catch (err) {
        console.error('Admin setup error:', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Setup failed' });
    }
});

// ── GET /api/admin/auth/check ─────────────────────────────────────────────────
// Check if admin account exists (for setup vs login flow)
router.get('/check', async (req, res) => {
    try {
        const result = await db.getOne('SELECT COUNT(*)::int AS count FROM admin_users');
        res.json({
            hasAdmin: result.count > 0,
            needsSetup: result.count === 0
        });
    } catch (err) {
        console.error('Admin check error:', err);
        res.status(500).json({ error: 'Check failed' });
    }
});

// ── GET /api/admin/auth/me ────────────────────────────────────────────────────
// Verify current token is valid
router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
        return res.status(401).json({ error: 'Invalid or expired admin token' });
    }

    res.json({
        success: true,
        admin: {
            id: decoded.id,
            displayName: decoded.displayName,
            email: decoded.email,
            role: decoded.role
        }
    });
});

module.exports = router;
