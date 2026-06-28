-- ── Admin flag on profiles ────────────────────────────────────────────────────
-- Manually set is_admin = true in the Supabase dashboard for admin users.
-- Never exposed to clients via RLS — the API layer checks it with the service role key.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;
