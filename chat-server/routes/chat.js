/**
 * Keymus Chat — Client Chat Routes (REST)
 * Endpoints for authenticated users (registered + guests)
 */
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { sanitizeMessage } = require('../middleware/sanitize');

// ── GET /api/chat/conversations ───────────────────────────────────────────────
// Get all conversations for the authenticated user
router.get('/conversations', async (req, res) => {
    try {
        const userId = req.user.id;
        await ensureUser(req.user);

        const conversations = await db.getMany(`
            SELECT
                c.*,
                cp.last_read_at,
                (SELECT COUNT(*) FROM messages m
                 WHERE m.conversation_id = c.id
                 AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
                 AND m.sender_id != $1) AS unread_count,
                (SELECT m.content FROM messages m
                 WHERE m.conversation_id = c.id
                 ORDER BY m.created_at DESC LIMIT 1) AS last_message,
                (SELECT m.created_at FROM messages m
                 WHERE m.conversation_id = c.id
                 ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            WHERE cp.user_id = $1
            ORDER BY last_message_at DESC NULLS LAST
        `, [userId]);

        res.json({ conversations });
    } catch (err) {
        console.error('GET /conversations error:', err);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// ── POST /api/chat/conversations ──────────────────────────────────────────────
// Create a new support conversation (or return existing open one)
router.post('/conversations', async (req, res) => {
    try {
        const userId = req.user.id;
        const { subject } = req.body;

        await ensureUser(req.user);

        // Check for existing open support conversation
        const existing = await db.getOne(`
            SELECT c.* FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            WHERE cp.user_id = $1 AND c.type = 'support' AND c.status = 'open'
            ORDER BY c.updated_at DESC LIMIT 1
        `, [userId]);

        if (existing) {
            return res.json({ conversation: existing, existing: true });
        }

        // Create new conversation
        const conversation = await db.getOne(`
            INSERT INTO conversations (type, subject, created_by, status)
            VALUES ('support', $1, $2, 'open')
            RETURNING *
        `, [subject || 'Support Chat', userId]);

        // Add user as participant
        await db.query(`
            INSERT INTO conversation_participants (conversation_id, user_id)
            VALUES ($1, $2)
        `, [conversation.id, userId]);

        // Notify admins via Socket.io
        const io = req.app.get('io');
        if (io) {
            const user = await db.getOne('SELECT * FROM chat_users WHERE id = $1', [userId]);
            io.of('/admin').emit('admin:new-conversation', {
                conversation,
                user: { id: userId, displayName: user?.display_name, isGuest: user?.is_guest }
            });
        }

        res.status(201).json({ conversation, existing: false });
    } catch (err) {
        console.error('POST /conversations error:', err);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// ── GET /api/chat/conversations/:id/messages ──────────────────────────────────
// Get messages for a specific conversation (with pagination)
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = req.params.id;
        const before = req.query.before;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        // Verify user is a participant
        const participant = await db.getOne(`
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = $1 AND user_id = $2
        `, [conversationId, userId]);

        if (!participant) {
            return res.status(403).json({ error: 'Not a participant in this conversation' });
        }

        let messages;
        if (before) {
            messages = await db.getMany(`
                SELECT m.*, cu.display_name AS sender_name, cu.avatar_url AS sender_avatar
                FROM messages m
                JOIN chat_users cu ON m.sender_id = cu.id
                WHERE m.conversation_id = $1 AND m.created_at < $2
                ORDER BY m.created_at DESC
                LIMIT $3
            `, [conversationId, before, limit]);
        } else {
            messages = await db.getMany(`
                SELECT m.*, cu.display_name AS sender_name, cu.avatar_url AS sender_avatar
                FROM messages m
                JOIN chat_users cu ON m.sender_id = cu.id
                WHERE m.conversation_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2
            `, [conversationId, limit]);
        }

        // Update last_read_at
        await db.query(`
            UPDATE conversation_participants SET last_read_at = NOW()
            WHERE conversation_id = $1 AND user_id = $2
        `, [conversationId, userId]);

        res.json({ messages: messages.reverse() });
    } catch (err) {
        console.error('GET /conversations/:id/messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// ── POST /api/chat/conversations/:id/messages ─────────────────────────────────
// Send a message (REST fallback when Socket.io is unavailable)
router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = req.params.id;
        const { content, contentType } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify participation
        const participant = await db.getOne(`
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = $1 AND user_id = $2
        `, [conversationId, userId]);

        if (!participant) {
            return res.status(403).json({ error: 'Not a participant in this conversation' });
        }

        const sanitized = sanitizeMessage(content);

        const message = await db.getOne(`
            INSERT INTO messages (conversation_id, sender_id, content, content_type)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [conversationId, userId, sanitized, contentType || 'text']);

        // Attach sender info
        const sender = await db.getOne('SELECT display_name, avatar_url FROM chat_users WHERE id = $1', [userId]);
        message.sender_name = sender?.display_name;
        message.sender_avatar = sender?.avatar_url;

        // Broadcast via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.of('/chat').to(`conversation:${conversationId}`).emit('chat:new-message', { message });
            io.of('/admin').emit('admin:new-message', { message, conversationId });
        }

        res.status(201).json({ message });
    } catch (err) {
        console.error('POST /conversations/:id/messages error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ── GET /api/chat/unread ──────────────────────────────────────────────────────
// Get total unread message count
router.get('/unread', async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.getOne(`
            SELECT COALESCE(SUM(sub.cnt), 0) AS total_unread
            FROM (
                SELECT COUNT(*) AS cnt
                FROM messages m
                JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
                WHERE cp.user_id = $1
                  AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
                  AND m.sender_id != $1
            ) sub
        `, [userId]);

        res.json({ unread: parseInt(result.total_unread) || 0 });
    } catch (err) {
        console.error('GET /unread error:', err);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// ── GET /api/chat/poll ────────────────────────────────────────────────────────
// Fallback polling endpoint (5-second interval when WebSocket is down)
router.get('/poll', async (req, res) => {
    try {
        const userId = req.user.id;
        const since = req.query.since || new Date(Date.now() - 10000).toISOString();

        const messages = await db.getMany(`
            SELECT m.*, cu.display_name AS sender_name, cu.avatar_url AS sender_avatar
            FROM messages m
            JOIN chat_users cu ON m.sender_id = cu.id
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE cp.user_id = $1
              AND m.created_at > $2
              AND m.sender_id != $1
            ORDER BY m.created_at ASC
        `, [userId, since]);

        const unreadResult = await db.getOne(`
            SELECT COALESCE(SUM(sub.cnt), 0) AS total_unread
            FROM (
                SELECT COUNT(*) AS cnt
                FROM messages m
                JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
                WHERE cp.user_id = $1
                  AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
                  AND m.sender_id != $1
            ) sub
        `, [userId]);

        res.json({
            messages,
            unread: parseInt(unreadResult.total_unread) || 0,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('GET /poll error:', err);
        res.status(500).json({ error: 'Poll failed' });
    }
});

// ── Helper: Ensure user exists in chat_users ──────────────────────────────────
async function ensureUser(user) {
    await db.query(`
        INSERT INTO chat_users (id, display_name, is_guest, is_admin)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW()
    `, [
        user.id,
        user.displayName || user.name || user.email || `User-${String(user.id).slice(0, 6)}`,
        user.isGuest || false,
        user.role === 'admin'
    ]);
}

module.exports = router;
