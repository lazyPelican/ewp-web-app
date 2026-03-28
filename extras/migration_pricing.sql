-- ── Pricing table ──────────────────────────────────────────────
-- Stores the entire pricing config as a single JSON row with id = 'main'
create table if not exists pricing (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz default now()
);

alter table pricing enable row level security;

-- All authenticated users can read pricing (needed by the estimating app)
create policy "Authenticated users can read pricing"
  on pricing for select
  using (auth.role() = 'authenticated');

-- Only authenticated users can write (admin check is enforced in the app)
create policy "Authenticated users can upsert pricing"
  on pricing for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update pricing"
  on pricing for update
  using (auth.role() = 'authenticated');
