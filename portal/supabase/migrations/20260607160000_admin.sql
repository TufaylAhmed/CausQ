create table public.admin_audit (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  target     text,
  detail     jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
create policy admin_audit_staff_select on public.admin_audit
  for select using (public.auth_is_staff());

-- Append an audit entry (staff only).
create or replace function public.log_admin_action(p_action text, p_target text default null, p_detail jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_is_staff() then raise exception 'forbidden'; end if;
  insert into public.admin_audit (actor_id, action, target, detail)
  values (auth.uid(), p_action, p_target, coalesce(p_detail, '{}'));
end;
$$;

-- Create an invite and return its token (staff only).
create or replace function public.create_invite(p_org uuid, p_email text default null, p_days int default 14)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if not public.auth_is_staff() then raise exception 'forbidden'; end if;
  v_token := replace(gen_random_uuid()::text, '-', '');
  insert into public.invites (token, org_id, email, expires_at)
  values (v_token, p_org, p_email, now() + make_interval(days => p_days));
  insert into public.admin_audit (actor_id, action, target, detail)
  values (auth.uid(), 'create_invite', p_org::text, jsonb_build_object('email', p_email));
  return v_token;
end;
$$;

-- Reject a pending profile (staff only).
create or replace function public.reject_profile(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_is_staff() then raise exception 'forbidden'; end if;
  update public.profiles set status = 'rejected' where id = p_id;
  insert into public.admin_audit (actor_id, action, target)
  values (auth.uid(), 'reject_profile', p_id::text);
end;
$$;

revoke all on function public.log_admin_action(text, text, jsonb) from anon;
revoke all on function public.create_invite(uuid, text, int) from anon;
revoke all on function public.reject_profile(uuid) from anon;
