/**
 * Keymus Chat — /admin Namespace
 * Handles real-time events for admin chat management
 */
const db = require('../db/database');
const { sanitizeMessage } = require('../middleware/sanitize');
const { createSocketThrottle } = require('../middleware/rate-limit');

function setupAdminNamespace(nsp, chatNsp) {
    const messageThrottle = createSocketThrottle(60); // 60 messages per minute for admins

    nsp.on('connection', async (socket) => {
        const admin = socket.user;
        console.log(`[/admin] Connected: ${admin.id}`);

        // Ensure admin exists in chat_users
        await db.query(`
            INSERT INTO chat_users (id, display_name, is_admin, is_guest)
            VALUES ($1, $2, TRUE, FALSE)
            ON CONFLICT (id) DO UPDATE SET is_admin = TRUE, is_online = TRUE, last_seen_at = NOW()
        `, [admin.id, admin.displayName || admin.name || admin.email || 'Admin']).catch(() => {});

        // ── Send initial data on connect ─────────────────────────────────────
        try {
            const openConversations = await db.getMany(`
                SELECT
                    c.*,
                    cu.display_name AS creator_name,
                    cu.is_guest AS creator_is_guest,
                    cu.is_online AS creator_is_online,
                    cu.avatar_url AS creator_avatar,
                    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
                    (SELECT m.content FROM messages m
                     WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
                    (SELECT m.created_at FROM messages m
                     WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
                FROM conversations c
                LEFT JOIN chat_users cu ON c.created_by = cu.id
                WHERE c.status = 'open'
                ORDER BY last_message_at DESC NULLS LAST
                LIMIT 100
            `);

            socket.emit('admin:conversations', { conversations: openConversations });

            const stats = await db.getOne(`
                SELECT
                    (SELECT COUNT(*) FROM conversations WHERE status = 'open') AS open_conversations,
                    (SELECT COUNT(*) FROM conversations WHERE status = 'resolved') AS resolved_conversations,
                    (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours') AS messages_today,
                    (SELECT COUNT(*) FROM chat_users WHERE is_online = TRUE AND is_admin = FALSE) AS online_users
            `);
            socket.emit('admin:stats', { stats });
        } catch (err) {
            console.error('[/admin] Initial data error:', err.message);
        }

        // ── admin:reply ──────────────────────────────────────────────────────
        // Admin replies to a user's conversation
        socket.on('admin:reply', async (data, callback) => {
            try {
                if (!messageThrottle(socket.id)) {
                    return callback?.({ error: 'Rate limit exceeded' });
                }

                const { conversationId, content, contentType, personaName } = data;

                if (!content || !content.trim()) {
                    return callback?.({ error: 'Message content is required' });
                }

                const sanitized = sanitizeMessage(content);

                // Ensure admin is a participant
                await db.query(`
                    INSERT INTO conversation_participants (conversation_id, user_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                `, [conversationId, admin.id]);

                const message = await db.getOne(`
                    INSERT INTO messages (conversation_id, sender_id, content, content_type, is_admin_reply, persona_name)
                    VALUES ($1, $2, $3, $4, TRUE, $5)
                    RETURNING *
                `, [conversationId, admin.id, sanitized, contentType || 'text', personaName || null]);

                // Attach sender info
                const sender = await db.getOne(
                    'SELECT display_name, avatar_url FROM chat_users WHERE id = $1',
                    [admin.id]
                );
                message.sender_name = personaName || sender?.display_name || 'Support';
                message.sender_avatar = sender?.avatar_url;
                message.sender_is_admin = true;

                // Keep conversations.updated_at fresh so sidebar ordering is correct
                await db.query(
                    'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
                    [conversationId]
                ).catch(() => {});

                // Send to user via /chat namespace
                chatNsp.to(`conversation:${conversationId}`).emit('chat:new-message', { message });

                // Notify other admins
                socket.broadcast.emit('admin:new-message', { message, conversationId });

                callback?.({ success: true, message });
            } catch (err) {
                console.error('[/admin] reply error:', err.message);
                callback?.({ error: 'Failed to send reply' });
            }
        });

        // ── admin:view-conversation ──────────────────────────────────────────
        // Load a conversation's messages
        socket.on('admin:view-conversation', async (data, callback) => {
            try {
                const { conversationId, before, limit } = data;
                const msgLimit = Math.min(limit || 50, 200);

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
                        ORDER BY m.created_at DESC LIMIT $3
                    `, [conversationId, before, msgLimit]);
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
                        ORDER BY m.created_at DESC LIMIT $2
                    `, [conversationId, msgLimit]);
                }

                const conversation = await db.getOne(`
                    SELECT c.*, cu.display_name AS creator_name, cu.is_guest AS creator_is_guest
                    FROM conversations c
                    LEFT JOIN chat_users cu ON c.created_by = cu.id
                    WHERE c.id = $1
                `, [conversationId]);

                // Join room for real-time updates on this conversation
                socket.join(`admin:conversation:${conversationId}`);

                callback?.({ success: true, conversation, messages: messages.reverse() });
            } catch (err) {
                console.error('[/admin] view-conversation error:', err.message);
                callback?.({ error: 'Failed to load conversation' });
            }
        });

        // ── admin:resolve ────────────────────────────────────────────────────
        socket.on('admin:resolve', async (data, callback) => {
            try {
                const { conversationId } = data;

                await db.query(`UPDATE conversations SET status = 'resolved' WHERE id = $1`, [conversationId]);

                // System message
                await db.query(`
                    INSERT INTO messages (conversation_id, sender_id, content, content_type)
                    VALUES ($1, $2, 'This conversation has been resolved. Thank you for contacting support!', 'system')
                `, [conversationId, admin.id]);

                // Notify the user
                chatNsp.to(`conversation:${conversationId}`).emit('chat:conversation-resolved', { conversationId });

                // Notify all admins
                nsp.emit('admin:conversation-resolved', { conversationId });

                callback?.({ success: true });
            } catch (err) {
                console.error('[/admin] resolve error:', err.message);
                callback?.({ error: 'Failed to resolve conversation' });
            }
        });

        // ── admin:reopen ─────────────────────────────────────────────────────
        socket.on('admin:reopen', async (data, callback) => {
            try {
                const { conversationId } = data;

                await db.query(`UPDATE conversations SET status = 'open' WHERE id = $1`, [conversationId]);

                nsp.emit('admin:conversation-reopened', { conversationId });

                callback?.({ success: true });
            } catch (err) {
                console.error('[/admin] reopen error:', err.message);
                callback?.({ error: 'Failed to reopen conversation' });
            }
        });

        // ── admin:typing / admin:stop-typing ─────────────────────────────────
        socket.on('admin:typing', (data) => {
            const { conversationId } = data;
            chatNsp.to(`conversation:${conversationId}`).emit('chat:typing', {
                conversationId,
                userId: admin.id,
                displayName: 'Support'
            });
        });

        socket.on('admin:stop-typing', (data) => {
            const { conversationId } = data;
            chatNsp.to(`conversation:${conversationId}`).emit('chat:stop-typing', {
                conversationId,
                userId: admin.id
            });
        });

        // ── admin:refresh ────────────────────────────────────────────────────
        // Manually refresh conversation list
        socket.on('admin:refresh', async (callback) => {
            try {
                const conversations = await db.getMany(`
                    SELECT
                        c.*,
                        cu.display_name AS creator_name,
                        cu.is_guest AS creator_is_guest,
                        cu.is_online AS creator_is_online,
                        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
                        (SELECT m.content FROM messages m
                         WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
                        (SELECT m.created_at FROM messages m
                         WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
                    FROM conversations c
                    LEFT JOIN chat_users cu ON c.created_by = cu.id
                    WHERE c.status = 'open'
                    ORDER BY last_message_at DESC NULLS LAST
                    LIMIT 100
                `);

                callback?.({ success: true, conversations });
            } catch (err) {
                console.error('[/admin] refresh error:', err.message);
                callback?.({ error: 'Failed to refresh' });
            }
        });

        // ── disconnect ───────────────────────────────────────────────────────
        socket.on('disconnect', async () => {
            console.log(`[/admin] Disconnected: ${admin.id}`);
            await db.query(
                'UPDATE chat_users SET is_online = FALSE, last_seen_at = NOW() WHERE id = $1',
                [admin.id]
            ).catch(() => {});
        });
    });
}

module.exports = setupAdminNamespace;
