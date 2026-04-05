-- =============================================================================
-- EWP Quote App — Supabase RLS Setup
-- Run this entire script in Supabase → SQL Editor
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE / ON CONFLICT
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADMINS TABLE
--    Stores admin emails. Used by is_admin() for RLS enforcement.
--    Add / remove admins here instead of relying on env vars alone.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
  email TEXT PRIMARY KEY
);

-- Insert the root admin (change this to your email)
INSERT INTO public.admins (email) VALUES ('11bilalahmed@gmail.com')
  ON CONFLICT DO NOTHING;

-- RLS on admins table itself: only admins can read/write
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage admins table" ON public.admins;
CREATE POLICY "Admins can manage admins table"
  ON public.admins FOR ALL TO authenticated
  USING  (lower(auth.email()) IN (SELECT email FROM public.admins))
  WITH CHECK (lower(auth.email()) IN (SELECT email FROM public.admins));


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HELPER FUNCTION: is_admin()
--    SECURITY DEFINER means it runs with elevated rights so users can't
--    bypass it by revoking SELECT on the admins table.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.admins
    WHERE  email = lower(auth.email())
  );
$$;

-- Revoke public execute; only authenticated roles need it
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PROJECTS TABLE
--    All authenticated users can read/write all projects (team tool).
--    Unauthenticated requests are blocked entirely.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read projects"  ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Authenticated users can read projects"
  ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert projects"
  ON public.projects FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects"
  ON public.projects FOR DELETE TO authenticated USING (true);

-- ── Database-level constraints on projects (fix #4) ──────────────────────────
-- Prevent empty required fields from reaching the DB
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.projects
  ADD CONSTRAINT IF NOT EXISTS projects_id_not_empty   CHECK (char_length(trim(id))   > 0),
  ADD CONSTRAINT IF NOT EXISTS projects_name_not_empty CHECK (char_length(trim(name)) > 0);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PRICING TABLE
--    Any authenticated user can read pricing (needed to build estimates).
--    Only admins can modify pricing.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read pricing" ON public.pricing;
DROP POLICY IF EXISTS "Only admins can modify pricing"       ON public.pricing;

CREATE POLICY "Authenticated users can read pricing"
  ON public.pricing FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can modify pricing"
  ON public.pricing FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. USER_APPROVALS TABLE
--    • A signed-in user can read their own approval row (to see their status).
--    • Admins can read and update all rows.
--    • New rows are inserted by the auth system on first sign-in (service role).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own approval"       ON public.user_approvals;
DROP POLICY IF EXISTS "Admins can manage all approvals"   ON public.user_approvals;
DROP POLICY IF EXISTS "Auth system can insert approvals"  ON public.user_approvals;

-- Signed-in user can see their own row
CREATE POLICY "Users can read own approval"
  ON public.user_approvals FOR SELECT TO authenticated
  USING (lower(auth.email()) = lower(email));

-- Admins can do everything
CREATE POLICY "Admins can manage all approvals"
  ON public.user_approvals FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allow authenticated users to INSERT their own first-sign-in row
CREATE POLICY "Auth system can insert approvals"
  ON public.user_approvals FOR INSERT TO authenticated
  WITH CHECK (lower(auth.email()) = lower(email));


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PRE_APPROVED_EMAILS TABLE
--    Admins only — no regular user needs to read or write this.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.pre_approved_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can manage pre-approved emails" ON public.pre_approved_emails;

CREATE POLICY "Only admins can manage pre-approved emails"
  ON public.pre_approved_emails FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PERFORMANCE: Indexes on commonly queried / filtered columns
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_updated_at   ON public.projects (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_approvals_email  ON public.user_approvals (lower(email));
CREATE INDEX IF NOT EXISTS idx_pre_approved_email    ON public.pre_approved_emails (email);

-- =============================================================================
-- DONE. Verify with:
--   SELECT schemaname, tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public';
-- All tables should show rowsecurity = true.
-- =============================================================================
