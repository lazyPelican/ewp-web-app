-- =============================================================================
-- Migration: Add first_name / last_name to user_approvals
-- Run once in Supabase → SQL Editor
-- Safe to re-run (uses IF NOT EXISTS)
-- =============================================================================

ALTER TABLE public.user_approvals
  ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name  TEXT DEFAULT '';

-- Optional: index for name-based lookups
CREATE INDEX IF NOT EXISTS idx_user_approvals_name
  ON public.user_approvals (lower(last_name), lower(first_name));

-- =============================================================================
-- DONE. Verify with:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'user_approvals' AND table_schema = 'public';
-- =============================================================================
