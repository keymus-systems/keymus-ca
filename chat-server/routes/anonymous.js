/**
 * Keymus Chat — Anonymous Session Routes
 * Creates guest sessions so users can chat without signing up
 */
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { signToken } = require('../middleware/auth');
const { generateGuestId, generateGuestName } = require('../utils/helpers');
const { strictLimiter } = require('../middleware/rate-limit');

// Apply strict rate limiting — 10 anonymous sessions per minute per IP
router.use(strictLimiter);

// ── POST /api/chat/anonymous ──────────────────────────────────────────────────
// Create an anonymous chat session
router.post('/', async (req, res) => {
    try {
        const guestId = generateGuestId();
        const displayName = generateGuestName();

        // Create guest user in database
        await db.query(`
            INSERT INTO chat_users (id, display_name, is_guest, is_admin)
            VALUES ($1, $2, TRUE, FALSE)
        `, [guestId, displayName]);

        // Sign JWT for the guest
        const token = signToken({
            id: guestId,
            displayName,
            isGuest: true,
            role: 'client'
        });

        console.log(`Anonymous session created: ${guestId} (${displayName})`);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: guestId,
                displayName,
                isGuest: true
            }
        });
    } catch (err) {
        console.error('POST /anonymous error:', err);
        res.status(500).json({ error: 'Failed to create anonymous session' });
    }
});

// ── POST /api/chat/anonymous/upgrade ──────────────────────────────────────────
// Upgrade a guest session to a registered user (merge messages)
router.post('/upgrade', async (req, res) => {
    try {
        const { guestToken, registeredToken } = req.body;

        if (!guestToken || !registeredToken) {
            return res.status(400).json({ error: 'Both guestToken and registeredToken are required' });
        }

        const { verifyToken } = require('../middleware/auth');
        const guestUser = verifyToken(guestToken);
        const regUser = verifyToken(registeredToken);

        if (!guestUser || !guestUser.isGuest) {
            return res.status(400).json({ error: 'Invalid guest token' });
        }
        if (!regUser || regUser.isGuest) {
            return res.status(400).json({ error: 'Invalid registered token' });
        }

        // Ensure registered user exists in chat_users
        await db.query(`
            INSERT INTO chat_users (id, display_name, is_guest, is_admin)
            VALUES ($1, $2, FALSE, $3)
            ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
        `, [regUser.id, regUser.displayName || regUser.name || regUser.email || 'User', regUser.role === 'admin']);

        // Transfer messages from guest to registered user
        await db.query(`
            UPDATE messages SET sender_id = $1 WHERE sender_id = $2
        `, [regUser.id, guestUser.id]);

        // Transfer conversation participation
        const guestConversations = await db.getMany(`
            SELECT conversation_id FROM conversation_participants WHERE user_id = $1
        `, [guestUser.id]);

        for (const conv of guestConversations) {
            // Add registered user as participant (ignore if already exists)
            await db.query(`
                INSERT INTO conversation_participants (conversation_id, user_id, last_read_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT DO NOTHING
            `, [conv.conversation_id, regUser.id]);

            // Update conversation creator
            await db.query(`
                UPDATE conversations SET created_by = $1 WHERE created_by = $2
            `, [regUser.id, guestUser.id]);
        }

        // Remove guest participant entries
        await db.query(`DELETE FROM conversation_participants WHERE user_id = $1`, [guestUser.id]);

        // Remove guest user
        await db.query(`DELETE FROM chat_users WHERE id = $1`, [guestUser.id]);

        console.log(`Guest ${guestUser.id} upgraded to registered user ${regUser.id}`);

        res.json({
            success: true,
            message: 'Guest session upgraded successfully',
            mergedConversations: guestConversations.length
        });
    } catch (err) {
        console.error('POST /anonymous/upgrade error:', err);
        res.status(500).json({ error: 'Failed to upgrade session' });
    }
});

module.exports = router;
