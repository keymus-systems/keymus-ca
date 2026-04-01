/**
 * Keymus Chat — /chat Namespace (Client-Facing)
 * Handles real-time messaging for authenticated users and guests
 */
const db = require('../db/database');
const { sanitizeMessage } = require('../middleware/sanitize');
const { createSocketThrottle } = require('../middleware/rate-limit');

function setupChatNamespace(nsp) {
    const connectedUsers = new Map(); // userId → Set<socketId>
    const messageThrottle = createSocketThrottle(30); // 30 messages per minute

    nsp.on('connection', async (socket) => {
        const user = socket.user;
        console.log(`[/chat] Connected: ${user.id} (${user.displayName || 'unknown'})`);

        // Track online status (support multiple tabs)
        if (!connectedUsers.has(user.id)) {
            connectedUsers.set(user.id, new Set());
        }
        connectedUsers.get(user.id).add(socket.id);

        // Mark user online
        await db.query(
            'UPDATE chat_users SET is_online = TRUE, last_seen_at = NOW() WHERE id = $1',
            [user.id]
        ).catch(() => {});

        // Auto-join user's existing conversation rooms
        try {
            const conversations = await db.getMany(
                'SELECT conversation_id FROM conversation_participants WHERE user_id = $1',
                [user.id]
            );
            conversations.forEach(c => socket.join(`conversation:${c.conversation_id}`));
        } catch (err) {
            console.error('[/chat] Failed to join rooms:', err.message);
        }

        // ── chat:get-or-create-conversation ──────────────────────────────────
        // Get existing open conversation or create a new one
        socket.on('chat:get-or-create-conversation', async (data, callback) => {
            try {
                const subject = data?.subject || 'Support Chat';

                // Ensure user exists in chat_users
                await db.query(`
                    INSERT INTO chat_users (id, display_name, is_guest, is_admin)
                    VALUES ($1, $2, $3, FALSE)
                    ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW()
                `, [
                    user.id,
                    user.displayName || user.name || `User-${String(user.id).slice(0, 6)}`,
                    user.isGuest || false
                ]);

                // Check for existing open support conversation
                let conversation = await db.getOne(`
                    SELECT c.* FROM conversations c
                    JOIN conversation_participants cp ON c.id = cp.conversation_id
                    WHERE cp.user_id = $1 AND c.type = 'support' AND c.status = 'open'
                    ORDER BY c.updated_at DESC LIMIT 1
                `, [user.id]);

                let isNew = false;
                if (!conversation) {
                    // Create new conversation
                    conversation = await db.getOne(`
                        INSERT INTO conversations (type, subject, created_by, status)
                        VALUES ('support', $1, $2, 'open')
                        RETURNING *
                    `, [subject, user.id]);

                    await db.query(`
                        INSERT INTO conversation_participants (conversation_id, user_id)
                        VALUES ($1, $2)
                    `, [conversation.id, user.id]);

                    isNew = true;

                    // Notify admins of new conversation
                    nsp.server.of('/admin').emit('admin:new-conversation', {
                        conversation,
                        user: {
                            id: user.id,
                            displayName: user.displayName,
                            isGuest: user.isGuest
                        }
                    });
                }

                // Join the conversation room
                socket.join(`conversation:${conversation.id}`);

                // Load recent messages
                const messages = await db.getMany(`
                    SELECT m.*, cu.display_name AS sender_name, cu.avatar_url AS sender_avatar
                    FROM messages m
                    JOIN chat_users cu ON m.sender_id = cu.id
                    WHERE m.conversation_id = $1
                    ORDER BY m.created_at DESC
                    LIMIT 50
                `, [conversation.id]);

                callback?.({
                    success: true,
                    conversation,
                    messages: messages.reverse(),
                    isNew
                });
            } catch (err) {
                console.error('[/chat] get-or-create error:', err.message);
                callback?.({ error: 'Failed to get conversation' });
            }
        });

        // ── chat:send ────────────────────────────────────────────────────────
        // Send a message
        socket.on('chat:send', async (data, callback) => {
            try {
                // Rate limit check
                if (!messageThrottle(socket.id)) {
                    return callback?.({ error: 'Sending too fast. Please slow down.' });
                }

                const { conversationId, content, contentType } = data;

                if (!content || !content.trim()) {
                    return callback?.({ error: 'Message content is required' });
                }

                // Verify participation
                const participant = await db.getOne(`
                    SELECT 1 FROM conversation_participants
                    WHERE conversation_id = $1 AND user_id = $2
                `, [conversationId, user.id]);

                if (!participant) {
                    return callback?.({ error: 'Not a participant in this conversation' });
                }

                const sanitized = sanitizeMessage(content);

                const message = await db.getOne(`
                    INSERT INTO messages (conversation_id, sender_id, content, content_type)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                `, [conversationId, user.id, sanitized, contentType || 'text']);

                // Attach sender info
                const sender = await db.getOne(
                    'SELECT display_name, avatar_url FROM chat_users WHERE id = $1',
                    [user.id]
                );
                message.sender_name = sender?.display_name;
                message.sender_avatar = sender?.avatar_url;

                // Keep conversations.updated_at fresh so sidebar ordering is correct
                await db.query(
                    'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
                    [conversationId]
                ).catch(() => {});

                // Broadcast to all participants in this conversation
                nsp.to(`conversation:${conversationId}`).emit('chat:new-message', { message });

                // Notify admin namespace
                nsp.server.of('/admin').emit('admin:new-message', {
                    message,
                    conversationId
                });

                // Push fresh stats to all connected admins
                try {
                    const stats = await db.getOne(`
                        SELECT
                            (SELECT COUNT(*) FROM conversations WHERE status = 'open') AS open_conversations,
                            (SELECT COUNT(*) FROM conversations WHERE status = 'resolved') AS resolved_conversations,
                            (SELECT COUNT(*) FROM conversations
                             WHERE status = 'resolved'
                             AND COALESCE(resolved_at, updated_at) > NOW() - INTERVAL '24 hours') AS resolved_today,
                            (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours') AS messages_today,
                            (SELECT COUNT(*) FROM messages) AS total_messages,
                            (SELECT COUNT(*) FROM chat_users WHERE is_online = TRUE AND is_admin = FALSE) AS online_users
                    `);
                    nsp.server.of('/admin').emit('admin:stats', { stats });
                } catch (_) {}

                callback?.({ success: true, message });
            } catch (err) {
                console.error('[/chat] send error:', err.message);
                callback?.({ error: 'Failed to send message' });
            }
        });

        // ── chat:history ─────────────────────────────────────────────────────
        // Load older messages (pagination)
        socket.on('chat:history', async (data, callback) => {
            try {
                const { conversationId, before, limit } = data;
                const msgLimit = Math.min(limit || 50, 100);

                const messages = await db.getMany(`
                    SELECT m.*, cu.display_name AS sender_name, cu.avatar_url AS sender_avatar
                    FROM messages m
                    JOIN chat_users cu ON m.sender_id = cu.id
                    WHERE m.conversation_id = $1 AND m.created_at < $2
                    ORDER BY m.created_at DESC
                    LIMIT $3
                `, [conversationId, before, msgLimit]);

                callback?.({ success: true, messages: messages.reverse() });
            } catch (err) {
                console.error('[/chat] history error:', err.message);
                callback?.({ error: 'Failed to load history' });
            }
        });

        // ── chat:typing / chat:stop-typing ───────────────────────────────────
        socket.on('chat:typing', (data) => {
            const { conversationId } = data;
            socket.to(`conversation:${conversationId}`).emit('chat:typing', {
                conversationId,
                userId: user.id,
                displayName: user.displayName
            });
            nsp.server.of('/admin').emit('admin:user-typing', {
                conversationId,
                userId: user.id,
                displayName: user.displayName
            });
        });

        socket.on('chat:stop-typing', (data) => {
            const { conversationId } = data;
            socket.to(`conversation:${conversationId}`).emit('chat:stop-typing', {
                conversationId,
                userId: user.id
            });
            nsp.server.of('/admin').emit('admin:user-stop-typing', {
                conversationId,
                userId: user.id
            });
        });

        // ── chat:read ────────────────────────────────────────────────────────
        // Mark messages as read
        socket.on('chat:read', async (data) => {
            try {
                const { conversationId } = data;
                await db.query(`
                    UPDATE conversation_participants SET last_read_at = NOW()
                    WHERE conversation_id = $1 AND user_id = $2
                `, [conversationId, user.id]);
            } catch (err) {
                console.error('[/chat] read error:', err.message);
            }
        });

        // ── disconnect ───────────────────────────────────────────────────────
        socket.on('disconnect', async () => {
            // Remove this socket from user's connections
            const sockets = connectedUsers.get(user.id);
            if (sockets) {
                sockets.delete(socket.id);
                // Only mark offline if no more connected sockets
                if (sockets.size === 0) {
                    connectedUsers.delete(user.id);
                    await db.query(
                        'UPDATE chat_users SET is_online = FALSE, last_seen_at = NOW() WHERE id = $1',
                        [user.id]
                    ).catch(() => {});
                    nsp.server.of('/admin').emit('admin:user-offline', { userId: user.id });
                }
            }
            console.log(`[/chat] Disconnected: ${user.id}`);
        });
    });

    return { connectedUsers };
}

module.exports = setupChatNamespace;
