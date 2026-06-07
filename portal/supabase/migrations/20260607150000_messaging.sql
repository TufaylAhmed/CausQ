-- Post a message to an engagement the caller can access (member or staff).
create or replace function public.post_message(p_engagement uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_ok boolean;
begin
  if auth.uid() is null then raise exception 'must be signed in'; end if;

  select public.auth_is_staff() or exists (
    select 1 from public.engagements e
    where e.id = p_engagement
      and e.org_id = public.auth_org_id()
      and public.auth_is_active()
  ) into v_ok;
  if not v_ok then raise exception 'forbidden'; end if;

  if coalesce(btrim(p_body), '') = '' then raise exception 'empty message'; end if;

  insert into public.messages (engagement_id, author_id, body)
  values (p_engagement, auth.uid(), p_body)
  returning id into v_id;
  return v_id;
end;
$$;

-- Read an engagement's messages with author display info (access-checked).
create or replace function public.engagement_messages(p_engagement uuid)
returns table (
  id uuid, body text, created_at timestamptz,
  author_id uuid, author_name text, author_role profile_role
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.auth_is_staff() or exists (
    select 1 from public.engagements e
    where e.id = p_engagement
      and e.org_id = public.auth_org_id()
      and public.auth_is_active()
  )) then
    raise exception 'forbidden';
  end if;

  return query
    select m.id, m.body, m.created_at, m.author_id, p.name, p.role
    from public.messages m
    join public.profiles p on p.id = m.author_id
    where m.engagement_id = p_engagement
    order by m.created_at asc;
end;
$$;

revoke all on function public.post_message(uuid, text) from anon;
revoke all on function public.engagement_messages(uuid) from anon;
