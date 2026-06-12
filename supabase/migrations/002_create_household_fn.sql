-- Creates a household and immediately sets the caller as owner.
-- security definer bypasses the hm_insert RLS bootstrap problem
-- (you can't be owner before the row exists).
create or replace function public.create_household(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.households (name, created_by)
  values (p_name, auth.uid())
  returning id into v_id;

  insert into public.household_members (household_id, user_id, role)
  values (v_id, auth.uid(), 'owner');

  return v_id;
end;
$$;
