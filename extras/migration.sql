-- ─────────────────────────────────────────────────────────────
-- Supabase migration: user_approvals table
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

create table if not exists user_approvals (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

-- Only authenticated users can read their OWN approval status
alter table user_approvals enable row level security;

create policy "Users can read own approval"
  on user_approvals for select
  using (auth.uid() = user_id);

create policy "Users can insert own approval"
  on user_approvals for insert
  with check (auth.uid() = user_id);

-- Admins need to read/update ALL rows.
-- The app handles admin checks via VITE_ADMIN_EMAILS.
-- Grant service-role or use a Supabase Edge Function for admin writes,
-- OR temporarily grant full access and rely on app-level admin gating:
create policy "Authenticated users can update approvals"
  on user_approvals for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can read all approvals"
  on user_approvals for select
  using (auth.role() = 'authenticated');
