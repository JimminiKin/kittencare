-- Enable Supabase Realtime for tables that need live sync
-- (Supabase disables realtime by default for new tables)

alter publication supabase_realtime add table public.kittens;
alter publication supabase_realtime add table public.feedings;
alter publication supabase_realtime add table public.weight_entries;
alter publication supabase_realtime add table public.elimination_entries;
alter publication supabase_realtime add table public.medications;
alter publication supabase_realtime add table public.medication_administrations;
alter publication supabase_realtime add table public.health_observations;
