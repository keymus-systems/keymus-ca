-- ══════════════════════════════════════════════════════════════════════════════
-- Keymus Chat — Migration: Admin Users + Registered Users Tables
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Admin Users ───────────────────────────────────────────────────────────────
-- Stores admin credentials for the admin chat panel login
CREATE TABLE IF NOT EXISTS admin_users (
    id              TEXT PRIMARY KEY DEFAULT 'admin_' || substr(gen_random_uuid()::text, 1, 8),
    username        TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    email           TEXT,
    role            TEXT NOT NULL DEFAULT 'admin',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

-- ── Registered Users ──────────────────────────────────────────────────────────
-- Stores user registrations from the public registration form
CREATE TABLE IF NOT EXISTS registered_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    country         TEXT,
    city            TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'contacted', 'approved', 'rejected')),
    notes           TEXT,
    email_sent      BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_registered_users_email ON registered_users (email);
CREATE INDEX IF NOT EXISTS idx_registered_users_status ON registered_users (status);
CREATE INDEX IF NOT EXISTS idx_registered_users_registered_at ON registered_users (registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users (username);

-- ── Auto-update trigger for registered_users ─────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_registered_users_updated_at'
    ) THEN
        CREATE TRIGGER trg_registered_users_updated_at
            BEFORE UPDATE ON registered_users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;
