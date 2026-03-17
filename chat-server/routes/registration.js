/**
 * Keymus Chat — Registration Routes
 * Handles public user registration + admin endpoints to view registrations.
 */
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { adminAuth } = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rate-limit');
const { sanitizeMessage } = require('../middleware/sanitize');
const { sendRegistrationEmail } = require('../services/email');

// ── POST /api/register ───────────────────────────────────────────────────────
// Public endpoint: New user registration
router.post('/', strictLimiter, async (req, res) => {
    try {
        const { firstName, lastName, email, phone, country, city } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'First name, last name, and email are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Check if email already registered
        const existing = await db.getOne(
            'SELECT id FROM registered_users WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (existing) {
            return res.status(409).json({ error: 'This email is already registered' });
        }

        // Sanitize inputs
        const cleanFirst = sanitizeMessage(firstName.trim());
        const cleanLast = sanitizeMessage(lastName.trim());
        const cleanEmail = email.toLowerCase().trim();
        const cleanPhone = phone ? sanitizeMessage(phone.trim()) : null;
        const cleanCountry = country ? sanitizeMessage(country.trim()) : null;
        const cleanCity = city ? sanitizeMessage(city.trim()) : null;

        // Insert registration
        const result = await db.getOne(`
            INSERT INTO registered_users (first_name, last_name, email, phone, country, city)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, first_name, last_name, email, phone, country, city, status, registered_at
        `, [cleanFirst, cleanLast, cleanEmail, cleanPhone, cleanCountry, cleanCity]);

        // Send confirmation email (non-blocking)
        sendRegistrationEmail({
            to: cleanEmail,
            firstName: cleanFirst,
            lastName: cleanLast
        }).then(sent => {
            if (sent) {
                db.query(
                    'UPDATE registered_users SET email_sent = TRUE WHERE id = $1',
                    [result.id]
                ).catch(err => console.error('Failed to update email_sent flag:', err));
            }
        }).catch(err => {
            console.error('Email send error:', err);
        });

        // Notify admins via Socket.io if available
        try {
            const io = req.app.get('io');
            if (io) {
                io.of('/admin').emit('admin:new-registration', {
                    registration: result
                });
            }
        } catch (e) {
            // Socket notification is optional
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please check your email for confirmation.',
            registration: {
                id: result.id,
                firstName: result.first_name,
                lastName: result.last_name,
                email: result.email,
                registeredAt: result.registered_at
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'This email is already registered' });
        }
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// ── GET /api/admin/registrations ──────────────────────────────────────────────
// Admin: View all registrations
router.get('/admin', adminAuth, async (req, res) => {
    try {
        const { status, search, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT *, COUNT(*) OVER() AS total_count
            FROM registered_users
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (
                first_name ILIKE $${params.length}
                OR last_name ILIKE $${params.length}
                OR email ILIKE $${params.length}
                OR phone ILIKE $${params.length}
                OR country ILIKE $${params.length}
                OR city ILIKE $${params.length}
            )`;
        }

        query += ' ORDER BY registered_at DESC';

        params.push(parseInt(limit));
        query += ` LIMIT $${params.length}`;

        params.push(parseInt(offset));
        query += ` OFFSET $${params.length}`;

        const rows = await db.getMany(query, params);
        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0;

        res.json({
            success: true,
            registrations: rows.map(r => ({
                id: r.id,
                firstName: r.first_name,
                lastName: r.last_name,
                email: r.email,
                phone: r.phone,
                country: r.country,
                city: r.city,
                status: r.status,
                emailSent: r.email_sent,
                notes: r.notes,
                registeredAt: r.registered_at,
                updatedAt: r.updated_at
            })),
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (err) {
        console.error('Admin get registrations error:', err);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

// ── GET /api/admin/registrations/stats ────────────────────────────────────────
// Admin: Registration stats
router.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        const stats = await db.getOne(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
                COUNT(*) FILTER (WHERE status = 'contacted')::int AS contacted,
                COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
                COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
                COUNT(*) FILTER (WHERE registered_at >= NOW() - INTERVAL '24 hours')::int AS today,
                COUNT(*) FILTER (WHERE registered_at >= NOW() - INTERVAL '7 days')::int AS this_week
            FROM registered_users
        `);

        res.json({ success: true, stats });
    } catch (err) {
        console.error('Registration stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ── PATCH /api/admin/registrations/:id/status ─────────────────────────────────
// Admin: Update registration status
router.patch('/admin/:id/status', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        if (!status || !['pending', 'contacted', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await db.getOne(`
            UPDATE registered_users
            SET status = $1, notes = COALESCE($2, notes)
            WHERE id = $3
            RETURNING *
        `, [status, notes || null, id]);

        if (!result) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        res.json({
            success: true,
            registration: {
                id: result.id,
                firstName: result.first_name,
                lastName: result.last_name,
                email: result.email,
                status: result.status,
                notes: result.notes,
                updatedAt: result.updated_at
            }
        });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
