-- ══════════════════════════════════════════════════════════════════════════════
-- Keymus Chat — Migration 003
-- Adds resolved_at column to conversations for accurate "resolved today" stats
-- Safe to run multiple times (all statements are idempotent)
-- Run: node db/migrate.js
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Add resolved_at column ─────────────────────────────────────────────────
-- Tracks the exact timestamp a conversation was resolved so we can accurately
-- count conversations resolved within any time window (e.g. today).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE conversations ADD COLUMN resolved_at TIMESTAMPTZ;
        RAISE NOTICE 'Added column conversations.resolved_at';
    ELSE
        RAISE NOTICE 'Column conversations.resolved_at already exists, skipping.';
    END IF;
END;
$$;

-- ── 2. Backfill existing resolved conversations ───────────────────────────────
-- For any rows already resolved before this migration, estimate resolved_at
-- from updated_at (best available proxy for when they were resolved).
UPDATE conversations
SET resolved_at = updated_at
WHERE status = 'resolved'
  AND resolved_at IS NULL;

-- ── 3. Index for fast "resolved today" queries ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_resolved_at
    ON conversations (resolved_at DESC)
    WHERE resolved_at IS NOT NULL;

-- ── 4. Trigger: auto-set resolved_at when status changes to 'resolved' ────────
-- This ensures resolved_at is always set by the DB itself, regardless of
-- whether the application code calls the update or not.
CREATE OR REPLACE FUNCTION set_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set resolved_at when status transitions to 'resolved'
    IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') THEN
        NEW.resolved_at = NOW();
    END IF;
    -- Clear resolved_at if conversation is reopened
    IF NEW.status != 'resolved' AND OLD.status = 'resolved' THEN
        NEW.resolved_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conversations_resolved_at'
    ) THEN
        CREATE TRIGGER trg_conversations_resolved_at
            BEFORE UPDATE ON conversations
            FOR EACH ROW
            EXECUTE FUNCTION set_resolved_at();
        RAISE NOTICE 'Created trigger trg_conversations_resolved_at';
    ELSE
        RAISE NOTICE 'Trigger trg_conversations_resolved_at already exists, skipping.';
    END IF;
END;
$$;

-- ── 5. Verify ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
    col_exists  BOOLEAN;
    idx_exists  BOOLEAN;
    trig_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'resolved_at'
    ) INTO col_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'conversations' AND indexname = 'idx_conversations_resolved_at'
    ) INTO idx_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conversations_resolved_at'
    ) INTO trig_exists;

    RAISE NOTICE '';
    RAISE NOTICE '── Migration 003 verification ──────────────────────────────';
    RAISE NOTICE '  conversations.resolved_at column : %', CASE WHEN col_exists  THEN 'OK' ELSE 'MISSING' END;
    RAISE NOTICE '  idx_conversations_resolved_at    : %', CASE WHEN idx_exists  THEN 'OK' ELSE 'MISSING' END;
    RAISE NOTICE '  trg_conversations_resolved_at    : %', CASE WHEN trig_exists THEN 'OK' ELSE 'MISSING' END;
    RAISE NOTICE '────────────────────────────────────────────────────────────';
END;
$$;
