-- Tracks when each kitten+alertType was last pushed so the cron job can
-- enforce a 2-hour cooldown and avoid spamming users.

create table public.push_alert_log (
  id          uuid primary key default gen_random_uuid(),
  kitten_id   uuid not null references public.kittens(id) on delete cascade,
  alert_type  text not null,
  pushed_at   timestamptz not null default now()
);

create index push_alert_log_kitten_idx on public.push_alert_log(kitten_id, alert_type, pushed_at desc);

-- Only the service role (cron) writes to this table; no user-facing RLS needed.
alter table public.push_alert_log enable row level security;
