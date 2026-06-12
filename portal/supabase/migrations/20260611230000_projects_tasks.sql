-- Phase 3: projects upgrade. Tasks per engagement, a computed health view,
-- client file uploads, and notification links pointed at /portal/projects.

-- Tasks -------------------------------------------------------------------
create table public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  engagement_id       uuid not null references public.engagements (id) on delete cascade,
  title               text not null,
  description         text,
  status              milestone_status not null default 'todo',
  assignee_profile_id uuid references public.profiles (id) on delete set null,
  due_date            date,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now()
);
create index idx_tasks_engagement on public.tasks (engagement_id);

alter table public.tasks enable row level security;

create policy tasks_select on public.tasks
  for select using (
    public.auth_is_staff() or exists (
      select 1 from public.engagements e
      where e.id = tasks.engagement_id
        and e.org_id = public.auth_org_id()
        and public.auth_is_active()
    )
  );
create policy tasks_staff_write on public.tasks
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());

-- Project health view -----------------------------------------------------
-- security_invoker so RLS on engagements/milestones/tasks scopes rows to the
-- caller. Health = milestone completion (or progress when none), minus a
-- penalty for overdue tasks.
create view public.engagement_health
with (security_invoker = on) as
select
  e.id as engagement_id,
  e.org_id,
  coalesce(m.total, 0)::int as milestones_total,
  coalesce(m.done, 0)::int as milestones_done,
  coalesce(t.overdue, 0)::int as tasks_overdue,
  greatest(0, least(100,
    (case when coalesce(m.total, 0) > 0
          then round(100.0 * m.done / m.total)::int
          else e.progress end)
    - least(30, coalesce(t.overdue, 0)::int * 10)
  ))::int as health
from public.engagements e
left join (
  select engagement_id,
         count(*)::int as total,
         count(*) filter (where status = 'done')::int as done
  from public.milestones group by engagement_id
) m on m.engagement_id = e.id
left join (
  select engagement_id, count(*)::int as overdue
  from public.tasks
  where status <> 'done' and due_date is not null and due_date < current_date
  group by engagement_id
) t on t.engagement_id = e.id;

grant select on public.engagement_health to anon, authenticated;

-- Client document uploads -------------------------------------------------
-- Active members may upload under their org's client-uploads area. Staff still
-- own all writes via documents_staff_write.
create policy documents_client_upload on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and public.auth_is_active()
    and name like public.auth_org_id()::text || '/projects/%/client-uploads/%'
  );

-- Records a client-uploaded document row (SECURITY DEFINER bypasses the
-- staff-only documents write policy) after verifying membership and that the
-- path lives under this org + engagement's client-uploads area.
create or replace function public.record_client_document(
  p_engagement uuid, p_filename text, p_path text, p_size bigint
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'must be signed in'; end if;

  select org_id into v_org from public.engagements where id = p_engagement;
  if v_org is null then raise exception 'engagement not found'; end if;

  if not (public.auth_is_staff() or (v_org = public.auth_org_id() and public.auth_is_active())) then
    raise exception 'forbidden';
  end if;

  if p_path not like v_org::text || '/projects/' || p_engagement::text || '/client-uploads/%' then
    raise exception 'invalid path';
  end if;

  insert into public.documents (org_id, engagement_id, filename, storage_path, size_bytes, uploaded_by)
  values (v_org, p_engagement, p_filename, p_path, coalesce(p_size, 0), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.record_client_document(uuid, text, text, bigint) from public;
grant execute on function public.record_client_document(uuid, text, text, bigint) to authenticated;

-- Notification triggers: point links at /portal/projects, and alert the
-- engagement lead when a client uploads a document. -----------------------
create or replace function public.tg_notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_title text;
  v_lead uuid;
  v_author_role profile_role;
  v_author_name text;
begin
  select e.org_id, e.title, e.lead_id into v_org, v_title, v_lead
  from public.engagements e where e.id = new.engagement_id;

  select role, coalesce(name, email) into v_author_role, v_author_name
  from public.profiles where id = new.author_id;

  if v_author_role in ('staff', 'admin') then
    perform public.notify_org_clients(
      v_org, 'message',
      'New message on ' || v_title,
      left(new.body, 140),
      '/portal/projects/' || new.engagement_id,
      new.author_id
    );
  else
    perform public.notify_profile(
      v_lead, v_org, 'message',
      'New message on ' || v_title,
      v_author_name || ': ' || left(new.body, 120),
      '/portal/projects/' || new.engagement_id
    );
  end if;
  return new;
end;
$$;

create or replace function public.tg_notify_document()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uploader_role profile_role;
  v_lead uuid;
begin
  select role into v_uploader_role from public.profiles where id = new.uploaded_by;
  if new.uploaded_by is null or v_uploader_role in ('staff', 'admin') then
    perform public.notify_org_clients(
      new.org_id, 'document',
      'New document: ' || new.filename,
      null,
      case when new.engagement_id is not null
           then '/portal/projects/' || new.engagement_id
           else '/portal' end,
      new.uploaded_by
    );
  elsif new.engagement_id is not null then
    select lead_id into v_lead from public.engagements where id = new.engagement_id;
    perform public.notify_profile(
      v_lead, new.org_id, 'document',
      'Client uploaded: ' || new.filename,
      null,
      '/portal/projects/' || new.engagement_id
    );
  end if;
  return new;
end;
$$;

create or replace function public.tg_notify_milestone()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_title text;
begin
  if new.status = 'done' and old.status is distinct from new.status then
    select e.org_id, e.title into v_org, v_title
    from public.engagements e where e.id = new.engagement_id;
    perform public.notify_org_clients(
      v_org, 'milestone',
      'Milestone completed: ' || new.title,
      'on ' || v_title,
      '/portal/projects/' || new.engagement_id,
      null
    );
  end if;
  return new;
end;
$$;
