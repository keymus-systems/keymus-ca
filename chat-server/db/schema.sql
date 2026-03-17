-- ══════════════════════════════════════════════════════════════════════════════
-- Keymus Chat — PostgreSQL Schema
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Chat Users ────────────────────────────────────────────────────────────────
-- Mirrors main backend users + anonymous guests
CREATE TABLE IF NOT EXISTS chat_users (
    id              TEXT PRIMARY KEY,
    display_name    TEXT NOT NULL,
    email           TEXT,
    avatar_url      TEXT,
    is_guest        BOOLEAN NOT NULL DEFAULT FALSE,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    is_online       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Conversations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            TEXT NOT NULL DEFAULT 'support'
                        CHECK (type IN ('support', 'dm', 'group')),
    subject         TEXT,
    status          TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'resolved', 'archived')),
    created_by      TEXT REFERENCES chat_users(id) ON DELETE SET NULL,
    assigned_to     TEXT REFERENCES chat_users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Conversation Participants ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id         TEXT NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
    content           TEXT NOT NULL,
    content_type      TEXT NOT NULL DEFAULT 'text'
                          CHECK (content_type IN ('text', 'image', 'file', 'voice', 'system')),
    attachment_url    TEXT,
    attachment_name   TEXT,
    is_admin_reply    BOOLEAN NOT NULL DEFAULT FALSE,
    persona_name      TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time
    ON messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender
    ON messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_created
    ON messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_status
    ON conversations (status);

CREATE INDEX IF NOT EXISTS idx_conversations_created_by
    ON conversations (created_by);

CREATE INDEX IF NOT EXISTS idx_conversations_updated
    ON conversations (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_participants_user
    ON conversation_participants (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_users_online
    ON chat_users (is_online) WHERE is_online = TRUE;

-- ── Auto-update updated_at trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conversations_updated_at'
    ) THEN
        CREATE TRIGGER trg_conversations_updated_at
            BEFORE UPDATE ON conversations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;
