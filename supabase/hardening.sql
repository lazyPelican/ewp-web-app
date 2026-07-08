-- EWP Quote App hardening additions.
-- Apply manually in Supabase SQL Editor after reviewing against the live schema.

-- Audit log for sensitive business actions.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID,
  actor_email TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_email, created_at DESC);

-- Prevent duplicate running timers for the same user at the database layer.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_running_timer_per_user
  ON public.time_entries(user_id)
  WHERE stopped_at IS NULL;

-- Frequently queried project fields. Keep JSON payload for details, but add reportable/indexable columns.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS bid_date DATE,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contractor_name TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_status_updated ON public.projects(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_bid_date ON public.projects(bid_date);
CREATE INDEX IF NOT EXISTS idx_projects_total_amount ON public.projects(total_amount);

-- Admin-surface RLS hardening. These blocks are no-ops when a table does not exist.
DO $$
BEGIN
  IF to_regclass('public.pricing') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage pricing" ON public.pricing';
    EXECUTE 'CREATE POLICY "Admins can manage pricing"
      ON public.pricing FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;

  IF to_regclass('public.user_approvals') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage approvals" ON public.user_approvals';
    EXECUTE 'CREATE POLICY "Admins can manage approvals"
      ON public.user_approvals FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;

  IF to_regclass('public.admins') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can read admins" ON public.admins';
    EXECUTE 'CREATE POLICY "Admins can read admins"
      ON public.admins FOR SELECT TO authenticated
      USING (public.is_admin())';
  END IF;
END $$;
