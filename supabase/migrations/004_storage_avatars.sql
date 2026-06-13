-- ── Avatar / photo storage bucket ────────────────────────────────────────────
-- Public bucket so photo URLs can be embedded directly in the app without
-- signed-URL overhead.  Files live under two top-level prefixes:
--   users/{user_id}/avatar   — user profile photos
--   kittens/{kitten_id}/avatar — kitten photos

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Any authenticated user may upload a user avatar only to their own prefix.
create policy "Users upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (string_to_array(name, '/'))[1] = 'users'
    and (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- Any authenticated user may upload kitten photos (household trust model).
create policy "Authenticated users upload kitten photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (string_to_array(name, '/'))[1] = 'kittens'
  );

-- Owners may replace / delete their own uploads.
create policy "Owners update own avatar objects"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

create policy "Owners delete own avatar objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

-- Public read is handled automatically by the bucket being public.
