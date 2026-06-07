-- Auto-create a pending profile on signup; match email domain to an org.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := lower(split_part(new.email, '@', 2));
  v_org    uuid;
begin
  select id into v_org from public.orgs
   where v_domain = any (verified_domains)
   limit 1;

  insert into public.profiles (id, email, name, org_id, role, status)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name', v_org, 'client', 'pending')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block clients from changing privileged fields; staff and service role may.
create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.auth_is_staff() then
    if new.status is distinct from old.status
       or new.role  is distinct from old.role
       or new.org_id is distinct from old.org_id then
      raise exception 'cannot modify privileged profile fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_fields on public.profiles;
create trigger trg_guard_profile_fields
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();
