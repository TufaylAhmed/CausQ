-- Staff approves a pending profile (optionally setting its org).
create or replace function public.approve_profile(p_id uuid, p_org uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_is_staff() then
    raise exception 'forbidden';
  end if;
  update public.profiles
     set status = 'active',
         org_id = coalesce(p_org, org_id)
   where id = p_id;
end;
$$;

-- A signed-in user redeems an invite token: joins the org and is activated.
create or replace function public.redeem_invite(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites;
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;

  select * into v_invite from public.invites
   where token = p_token
     and redeemed_by is null
     and expires_at > now();

  if v_invite.id is null then
    raise exception 'invalid or expired invite';
  end if;

  update public.profiles
     set org_id = v_invite.org_id, status = 'active'
   where id = auth.uid();

  update public.invites
     set redeemed_by = auth.uid()
   where id = v_invite.id;
end;
$$;

revoke all on function public.approve_profile(uuid, uuid) from anon;
revoke all on function public.redeem_invite(text) from anon;
