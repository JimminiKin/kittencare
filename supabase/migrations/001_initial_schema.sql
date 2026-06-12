-- ============================================================
-- KittenCare — initial schema  (run in Supabase SQL editor)
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ── Utility trigger ───────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Profiles (one per auth.users row) ────────────────────────────────────────

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Households ────────────────────────────────────────────────────────────────

create table public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger households_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

-- ── Household members ─────────────────────────────────────────────────────────

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on public.household_members(user_id);

-- ── Household invites ─────────────────────────────────────────────────────────

create table public.household_invites (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  invited_by    uuid references public.profiles(id) on delete set null,
  invited_email text not null,
  token         text not null unique default encode(gen_random_bytes(32), 'hex'),
  accepted_at   timestamptz,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

create index household_invites_email_idx on public.household_invites(invited_email);

-- ── RLS helper functions ──────────────────────────────────────────────────────
-- security definer so they run as the function owner and bypass RLS on
-- household_members itself (otherwise we'd get infinite recursion).

create or replace function public.is_member(hid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create or replace function public.is_owner(hid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ── Kittens ───────────────────────────────────────────────────────────────────

create table public.kittens (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references public.households(id) on delete cascade,
  created_by          uuid references public.profiles(id) on delete set null,
  name                text not null,
  photo               text,
  birth_date          date,
  estimated_age_days  integer,
  sex                 text check (sex in ('male', 'female', 'unknown')),
  intake_date         date,
  status              text not null default 'active'
                        check (status in ('active', 'adopted', 'transferred', 'deceased')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index kittens_household_idx on public.kittens(household_id);

create trigger kittens_updated_at
  before update on public.kittens
  for each row execute function public.set_updated_at();

-- ── Feedings ──────────────────────────────────────────────────────────────────

create table public.feedings (
  id                    uuid primary key default gen_random_uuid(),
  kitten_id             uuid not null references public.kittens(id) on delete cascade,
  household_id          uuid not null references public.households(id) on delete cascade,
  recorded_by           uuid references public.profiles(id) on delete set null,
  timestamp             timestamptz not null default now(),
  food_type             text check (food_type in ('formula', 'wet', 'solid')),
  method                text check (method in ('bottle', 'syringe', 'tube')),
  formula_type          text,
  amount_offered_ml     numeric,
  amount_consumed_ml    numeric,
  amount_consumed_grams numeric,
  notes                 text,
  created_at            timestamptz not null default now()
);

create index feedings_kitten_idx    on public.feedings(kitten_id);
create index feedings_household_idx on public.feedings(household_id);
create index feedings_ts_idx        on public.feedings(timestamp desc);

-- ── Weight entries ────────────────────────────────────────────────────────────

create table public.weight_entries (
  id           uuid primary key default gen_random_uuid(),
  kitten_id    uuid not null references public.kittens(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  recorded_by  uuid references public.profiles(id) on delete set null,
  timestamp    timestamptz not null default now(),
  weight_grams numeric not null,
  created_at   timestamptz not null default now()
);

create index weight_kitten_idx    on public.weight_entries(kitten_id);
create index weight_household_idx on public.weight_entries(household_id);
create index weight_ts_idx        on public.weight_entries(timestamp desc);

-- ── Elimination entries ───────────────────────────────────────────────────────

create table public.elimination_entries (
  id              uuid primary key default gen_random_uuid(),
  kitten_id       uuid not null references public.kittens(id) on delete cascade,
  household_id    uuid not null references public.households(id) on delete cascade,
  recorded_by     uuid references public.profiles(id) on delete set null,
  timestamp       timestamptz not null default now(),
  pee             boolean not null default false,
  poo             boolean not null default false,
  poo_consistency text check (poo_consistency in ('liquid', 'soft', 'normal', 'firm', 'hard')),
  poo_color       text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index elim_kitten_idx    on public.elimination_entries(kitten_id);
create index elim_household_idx on public.elimination_entries(household_id);

-- ── Medications ───────────────────────────────────────────────────────────────

create table public.medications (
  id              uuid primary key default gen_random_uuid(),
  kitten_id       uuid not null references public.kittens(id) on delete cascade,
  household_id    uuid not null references public.households(id) on delete cascade,
  created_by      uuid references public.profiles(id) on delete set null,
  name            text not null,
  dosage          text not null,
  frequency_hours numeric not null,
  start_date      timestamptz not null,
  end_date        timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index meds_kitten_idx    on public.medications(kitten_id);
create index meds_household_idx on public.medications(household_id);

create trigger medications_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

-- ── Medication administrations ────────────────────────────────────────────────

create table public.medication_administrations (
  id            uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  kitten_id     uuid not null references public.kittens(id) on delete cascade,
  household_id  uuid not null references public.households(id) on delete cascade,
  recorded_by   uuid references public.profiles(id) on delete set null,
  timestamp     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index admins_kitten_idx    on public.medication_administrations(kitten_id);
create index admins_household_idx on public.medication_administrations(household_id);
create index admins_med_idx       on public.medication_administrations(medication_id);

-- ── Health observations ───────────────────────────────────────────────────────

create table public.health_observations (
  id           uuid primary key default gen_random_uuid(),
  kitten_id    uuid not null references public.kittens(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  recorded_by  uuid references public.profiles(id) on delete set null,
  timestamp    timestamptz not null default now(),
  energy       text not null check (energy in ('normal', 'low', 'lethargic')),
  hydration    text not null check (hydration in ('normal', 'mild-concern', 'concerning')),
  appetite     text not null check (appetite in ('normal', 'reduced', 'poor')),
  temperature  numeric,
  notes        text,
  created_at   timestamptz not null default now()
);

create index health_kitten_idx    on public.health_observations(kitten_id);
create index health_household_idx on public.health_observations(household_id);

-- ── Share tokens (for vet read-only views) ────────────────────────────────────

create table public.share_tokens (
  id           uuid primary key default gen_random_uuid(),
  kitten_id    uuid not null references public.kittens(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  created_by   uuid references public.profiles(id) on delete set null,
  token        text not null unique default encode(gen_random_bytes(32), 'hex'),
  fields       text[] not null default array['weight', 'feedings', 'medications', 'health'],
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index share_kitten_idx on public.share_tokens(kitten_id);

-- ── Push subscriptions (Web Push, Phase 7) ───────────────────────────────────

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz not null default now()
);

create index push_user_idx on public.push_subscriptions(user_id);

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

alter table public.profiles                   enable row level security;
alter table public.households                 enable row level security;
alter table public.household_members          enable row level security;
alter table public.household_invites          enable row level security;
alter table public.kittens                    enable row level security;
alter table public.feedings                   enable row level security;
alter table public.weight_entries             enable row level security;
alter table public.elimination_entries        enable row level security;
alter table public.medications                enable row level security;
alter table public.medication_administrations enable row level security;
alter table public.health_observations        enable row level security;
alter table public.share_tokens               enable row level security;
alter table public.push_subscriptions         enable row level security;

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Users can see profiles of people in any shared household, or their own.
create policy "profiles_select"
  on public.profiles for select using (
    id = auth.uid()
    or exists (
      select 1 from public.household_members a
      join public.household_members b using (household_id)
      where a.user_id = auth.uid() and b.user_id = profiles.id
    )
  );

create policy "profiles_update_own"
  on public.profiles for update using (id = auth.uid());

-- ── households ────────────────────────────────────────────────────────────────
create policy "households_select"  on public.households for select using (is_member(id));
create policy "households_insert"  on public.households for insert with check (auth.uid() is not null);
create policy "households_update"  on public.households for update using (is_owner(id));
create policy "households_delete"  on public.households for delete using (is_owner(id));

-- ── household_members ──────────────────────────────────────────────────────────
create policy "hm_select"  on public.household_members for select using (is_member(household_id));
create policy "hm_insert"  on public.household_members for insert with check (is_owner(household_id));
create policy "hm_update"  on public.household_members for update using (is_owner(household_id));
-- Owners can remove anyone; members can leave themselves.
create policy "hm_delete"  on public.household_members for delete using (
  is_owner(household_id) or user_id = auth.uid()
);

-- ── household_invites ─────────────────────────────────────────────────────────
-- Members can list pending invites; owners can manage them.
-- The accept-invite flow runs server-side with the service-role key.
create policy "hi_select"  on public.household_invites for select using (is_member(household_id));
create policy "hi_insert"  on public.household_invites for insert with check (is_owner(household_id));
create policy "hi_delete"  on public.household_invites for delete using (is_owner(household_id));

-- ── kittens ───────────────────────────────────────────────────────────────────
create policy "kittens_select"  on public.kittens for select using (is_member(household_id));
create policy "kittens_insert"  on public.kittens for insert with check (is_member(household_id));
create policy "kittens_update"  on public.kittens for update using (is_member(household_id));
create policy "kittens_delete"  on public.kittens for delete using (is_owner(household_id));

-- ── feedings ──────────────────────────────────────────────────────────────────
create policy "feedings_select"  on public.feedings for select using (is_member(household_id));
create policy "feedings_insert"  on public.feedings for insert with check (is_member(household_id));
create policy "feedings_update"  on public.feedings for update
  using (recorded_by = auth.uid() or is_owner(household_id));
create policy "feedings_delete"  on public.feedings for delete
  using (recorded_by = auth.uid() or is_owner(household_id));

-- ── weight_entries ────────────────────────────────────────────────────────────
create policy "weight_select"  on public.weight_entries for select using (is_member(household_id));
create policy "weight_insert"  on public.weight_entries for insert with check (is_member(household_id));
create policy "weight_update"  on public.weight_entries for update
  using (recorded_by = auth.uid() or is_owner(household_id));
create policy "weight_delete"  on public.weight_entries for delete
  using (recorded_by = auth.uid() or is_owner(household_id));

-- ── elimination_entries ───────────────────────────────────────────────────────
create policy "elim_select"  on public.elimination_entries for select using (is_member(household_id));
create policy "elim_insert"  on public.elimination_entries for insert with check (is_member(household_id));
create policy "elim_update"  on public.elimination_entries for update
  using (recorded_by = auth.uid() or is_owner(household_id));
create policy "elim_delete"  on public.elimination_entries for delete
  using (recorded_by = auth.uid() or is_owner(household_id));

-- ── medications ───────────────────────────────────────────────────────────────
create policy "meds_select"  on public.medications for select using (is_member(household_id));
create policy "meds_insert"  on public.medications for insert with check (is_member(household_id));
create policy "meds_update"  on public.medications for update
  using (created_by = auth.uid() or is_owner(household_id));
create policy "meds_delete"  on public.medications for delete
  using (created_by = auth.uid() or is_owner(household_id));

-- ── medication_administrations ────────────────────────────────────────────────
create policy "admins_select"  on public.medication_administrations for select using (is_member(household_id));
create policy "admins_insert"  on public.medication_administrations for insert with check (is_member(household_id));
create policy "admins_delete"  on public.medication_administrations for delete
  using (recorded_by = auth.uid() or is_owner(household_id));

-- ── health_observations ───────────────────────────────────────────────────────
create policy "health_select"  on public.health_observations for select using (is_member(household_id));
create policy "health_insert"  on public.health_observations for insert with check (is_member(household_id));
create policy "health_update"  on public.health_observations for update
  using (recorded_by = auth.uid() or is_owner(household_id));
create policy "health_delete"  on public.health_observations for delete
  using (recorded_by = auth.uid() or is_owner(household_id));

-- ── share_tokens ──────────────────────────────────────────────────────────────
-- Vet-view reads happen server-side with service-role key (no RLS bypass needed on client).
create policy "share_select"  on public.share_tokens for select using (is_member(household_id));
create policy "share_insert"  on public.share_tokens for insert with check (is_owner(household_id));
create policy "share_delete"  on public.share_tokens for delete using (is_owner(household_id));

-- ── push_subscriptions ────────────────────────────────────────────────────────
create policy "push_all"  on public.push_subscriptions for all using (user_id = auth.uid());
