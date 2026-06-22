-- ── Kitten transfers ──────────────────────────────────────────────────────────
-- Allows a household owner to generate a one-time token that another
-- authenticated user can accept to receive a copy of the kitten profile.
-- The original kitten stays in the source household (status → 'transferred').

create table public.kitten_transfers (
  id           uuid primary key default gen_random_uuid(),
  kitten_id    uuid not null references public.kittens(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  created_by   uuid references public.profiles(id) on delete set null,
  token        text not null unique default encode(gen_random_bytes(32), 'hex'),
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now()
);

create index kt_kitten_idx    on public.kitten_transfers(kitten_id);
create index kt_household_idx on public.kitten_transfers(household_id);

alter table public.kitten_transfers enable row level security;

-- Members can view pending transfers for their own household kittens
create policy "kt_select" on public.kitten_transfers for select
  using (is_member(household_id));

-- Only household owners can create transfers
create policy "kt_insert" on public.kitten_transfers for insert
  with check (is_owner(household_id));

-- Only household owners can revoke transfers
create policy "kt_delete" on public.kitten_transfers for delete
  using (is_owner(household_id));
