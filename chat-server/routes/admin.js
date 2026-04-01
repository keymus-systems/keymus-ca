/**
 * Keymus Chat — Admin Routes (REST)
 * All routes require admin authentication
 */
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { adminAuth } = require('../middleware/auth');
const { sanitizeMessage } = require('../middleware/sanitize');

// Apply admin auth to all routes in this router
router.use(adminAuth);

// ── GET /api/admin/chat/conversations ─────────────────────────────────────────
// List all conversations (with filters)
router.get('/conversations', async (req, res) => {
    try {
        const status = req.query.status || 'open';
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search || '';

        let whereClause = 'WHERE c.status = $1';
        const params = [status];
        let paramIndex = 2;

        if (search) {
            whereClause += ` AND (
                cu.display_name ILIKE $${paramIndex}
                OR c.subject ILIKE $${paramIndex}
                OR cu.id ILIKE $${paramIndex}
            )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const conversations = await db.getMany(`
            SELECT
                c.*,
                cu.display_name AS creator_name,
                cu.is_guest AS creator_is_guest,
                cu.avatar_url AS creator_avatar,
                cu.is_online AS creator_is_online,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
                (SELECT m.content FROM messages m
                 WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
                (SELECT m.created_at FROM messages m
                 WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
                (SELECT m.sender_id FROM messages m
                 WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender_id
            FROM conversations c
            LEFT JOIN chat_users cu ON c.created_by = cu.id
            ${whereClause}
            ORDER BY last_message_at DESC NULLS LAST
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, limit, offset]);

        const countResult = await db.getOne(
            `SELECT COUNT(*) AS total FROM conversations c
             LEFT JOIN chat_users cu ON c.created_by = cu.id ${whereClause}`,
            params
        );

        res.json({
            conversations,
            total: parseInt(countResult.total),
            limit,
            offset
        });
    } catch (err) {
        console.error('Admin GET /conversations error:', err);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// ── GET /api/admin/chat/conversations/:id/messages ────────────────────────────
// Get all messages in a conversation (admin can view any)
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const before = req.query.before;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);

        let messages;
        if (before) {
            messages = await db.getMany(`
                SELECT m.*,
                       cu.display_name AS sender_name,
                       cu.avatar_url AS sender_avatar,
                       cu.is_guest AS sender_is_guest,
                       cu.is_admin AS sender_is_admin
                FROM messages m
                JOIN chat_users cu ON m.sender_id = cu.id
                WHERE m.conversation_id = $1 AND m.created_at < $2
                ORDER BY m.created_at DESC
                LIMIT $3
            `, [conversationId, before, limit]);
        } else {
            messages = await db.getMany(`
                SELECT m.*,
                       cu.display_name AS sender_name,
                       cu.avatar_url AS sender_avatar,
                       cu.is_guest AS sender_is_guest,
                       cu.is_admin AS sender_is_admin
                FROM messages m
                JOIN chat_users cu ON m.sender_id = cu.id
                WHERE m.conversation_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2
            `, [conversationId, limit]);
        }

        res.json({ messages: messages.reverse() });
    } catch (err) {
        console.error('Admin GET /conversations/:id/messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// ── POST /api/admin/chat/conversations/:id/reply ──────────────────────────────
// Admin replies to a conversation
router.post('/conversations/:id/reply', async (req, res) => {
    try {
        const adminId = req.user.id;
        const conversationId = req.params.id;
        const { content, contentType, personaName } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Ensure admin exists in chat_users
        await ensureAdminUser(req.user);

        // Ensure admin is a participant
        await db.query(`
            INSERT INTO conversation_participants (conversation_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
        `, [conversationId, adminId]);

        const sanitized = sanitizeMessage(content);

        const message = await db.getOne(`
            INSERT INTO messages (conversation_id, sender_id, content, content_type, is_admin_reply, persona_name)
            VALUES ($1, $2, $3, $4, TRUE, $5)
            RETURNING *
        `, [conversationId, adminId, sanitized, contentType || 'text', personaName || null]);

        // Keep conversations.updated_at fresh for correct sidebar ordering
        await db.query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
            [conversationId]
        ).catch(() => {});

        // Attach sender info
        const sender = await db.getOne('SELECT display_name, avatar_url FROM chat_users WHERE id = $1', [adminId]);
        message.sender_name = personaName || sender?.display_name || 'Support';
        message.sender_avatar = sender?.avatar_url;
        message.sender_is_admin = true;

        // Broadcast via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.of('/chat').to(`conversation:${conversationId}`).emit('chat:new-message', { message });
            io.of('/admin').emit('admin:new-message', { message, conversationId });
        }

        res.status(201).json({ message });
    } catch (err) {
        console.error('Admin POST /reply error:', err);
        res.status(500).json({ error: 'Failed to send reply' });
    }
});

// ── PATCH /api/admin/chat/conversations/:id/resolve ───────────────────────────
router.patch('/conversations/:id/resolve', async (req, res) => {
    try {
        const conversationId = req.params.id;

        const conversation = await db.getOne(`
            UPDATE conversations SET status = 'resolved' WHERE id = $1 RETURNING *
        `, [conversationId]);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Set resolved_at if the column exists (migration 003)
        await db.query(
            `UPDATE conversations SET resolved_at = NOW() WHERE id = $1`,
            [conversationId]
        ).catch(() => {});

        // Add system message
        await ensureAdminUser(req.user);
        await db.query(`
            INSERT INTO messages (conversation_id, sender_id, content, content_type)
            VALUES ($1, $2, 'This conversation has been resolved. Thank you for contacting support!', 'system')
        `, [conversationId, req.user.id]);

        const io = req.app.get('io');
        if (io) {
            io.of('/chat').to(`conversation:${conversationId}`).emit('chat:conversation-resolved', { conversationId });
            io.of('/admin').emit('admin:conversation-resolved', { conversationId });
        }

        res.json({ conversation });
    } catch (err) {
        console.error('Admin PATCH /resolve error:', err);
        res.status(500).json({ error: 'Failed to resolve conversation' });
    }
});

// ── PATCH /api/admin/chat/conversations/:id/reopen ────────────────────────────
router.patch('/conversations/:id/reopen', async (req, res) => {
    try {
        const conversationId = req.params.id;

        const conversation = await db.getOne(`
            UPDATE conversations SET status = 'open' WHERE id = $1 RETURNING *
        `, [conversationId]);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const io = req.app.get('io');
        if (io) {
            io.of('/admin').emit('admin:conversation-reopened', { conversationId });
        }

        res.json({ conversation });
    } catch (err) {
        console.error('Admin PATCH /reopen error:', err);
        res.status(500).json({ error: 'Failed to reopen conversation' });
    }
});

// ── GET /api/admin/chat/stats ─────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.getOne(`
            SELECT
                (SELECT COUNT(*) FROM conversations WHERE status = 'open') AS open_conversations,
                (SELECT COUNT(*) FROM conversations WHERE status = 'resolved') AS resolved_conversations,
                (SELECT COUNT(*) FROM conversations
                 WHERE status = 'resolved'
                 AND COALESCE(resolved_at, updated_at) > NOW() - INTERVAL '24 hours') AS resolved_today,
                (SELECT COUNT(*) FROM conversations) AS total_conversations,
                (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours') AS messages_today,
                (SELECT COUNT(*) FROM messages) AS total_messages,
                (SELECT COUNT(*) FROM chat_users WHERE is_online = TRUE AND is_admin = FALSE) AS online_users,
                (SELECT COUNT(*) FROM chat_users WHERE is_guest = TRUE) AS guest_users,
                (SELECT COUNT(*) FROM chat_users WHERE is_guest = FALSE AND is_admin = FALSE) AS registered_users
        `);

        res.json({ stats });
    } catch (err) {
        console.error('Admin GET /stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ── GET /api/admin/chat/online-users ──────────────────────────────────────────
router.get('/online-users', async (req, res) => {
    try {
        const users = await db.getMany(`
            SELECT id, display_name, is_guest, avatar_url, last_seen_at
            FROM chat_users
            WHERE is_online = TRUE AND is_admin = FALSE
            ORDER BY last_seen_at DESC
        `);

        res.json({ users });
    } catch (err) {
        console.error('Admin GET /online-users error:', err);
        res.status(500).json({ error: 'Failed to fetch online users' });
    }
});

// ── GET /api/admin/chat/poll ──────────────────────────────────────────────────
// Fallback polling for admin dashboard
router.get('/poll', async (req, res) => {
    try {
        const since = req.query.since || new Date(Date.now() - 10000).toISOString();

        const newMessages = await db.getMany(`
            SELECT m.*,
                   cu.display_name AS sender_name,
                   cu.is_guest AS sender_is_guest,
                   c.subject AS conversation_subject
            FROM messages m
            JOIN chat_users cu ON m.sender_id = cu.id
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.created_at > $1 AND m.is_admin_reply = FALSE
            ORDER BY m.created_at ASC
            LIMIT 100
        `, [since]);

        const openCount = await db.getOne(`SELECT COUNT(*) AS count FROM conversations WHERE status = 'open'`);

        res.json({
            messages: newMessages,
            openConversations: parseInt(openCount.count),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Admin GET /poll error:', err);
        res.status(500).json({ error: 'Poll failed' });
    }
});

// ── Helper ────────────────────────────────────────────────────────────────────
async function ensureAdminUser(user) {
    await db.query(`
        INSERT INTO chat_users (id, display_name, is_admin, is_guest)
        VALUES ($1, $2, TRUE, FALSE)
        ON CONFLICT (id) DO UPDATE SET is_admin = TRUE, last_seen_at = NOW()
    `, [user.id, user.displayName || user.name || user.email || 'Admin']);
}

module.exports = router;
