-- Notifications: per-recipient, org-scoped. Created by triggers on domain
-- events (staff message, new document, invoice sent/overdue, milestone done).
-- Clients never write this table directly: inserts come from SECURITY DEFINER
-- trigger helpers, and read-state changes go through RPCs.

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  org_id      uuid not null references public.orgs (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_notifications_recipient on public.notifications (profile_id, read_at);
create index idx_notifications_org on public.notifications (org_id);

alter table public.notifications enable row level security;

-- A user reads their own notifications while active; staff read all.
create policy notifications_select on public.notifications
  for select using (
    (profile_id = auth.uid() and public.auth_is_active())
    or public.auth_is_staff()
  );
-- No insert/update/delete policies: only SECURITY DEFINER functions write here.

-- Fan-out helper: notify every active client of an org, optionally excluding one.
create or replace function public.notify_org_clients(
  p_org uuid, p_type text, p_title text, p_body text, p_link text, p_exclude uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (profile_id, org_id, type, title, body, link)
  select pr.id, p_org, p_type, p_title, p_body, p_link
  from public.profiles pr
  where pr.org_id = p_org
    and pr.status = 'active'
    and pr.role = 'client'
    and (p_exclude is null or pr.id <> p_exclude);
end;
$$;

-- Single-recipient helper (e.g. the engagement lead).
create or replace function public.notify_profile(
  p_profile uuid, p_org uuid, p_type text, p_title text, p_body text, p_link text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_profile is null then return; end if;
  insert into public.notifications (profile_id, org_id, type, title, body, link)
  values (p_profile, p_org, p_type, p_title, p_body, p_link);
end;
$$;

-- Trigger: a new message. Staff message -> notify the org's clients; client
-- message -> notify the engagement lead.
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
      '/portal/engagements/' || new.engagement_id,
      new.author_id
    );
  else
    perform public.notify_profile(
      v_lead, v_org, 'message',
      'New message on ' || v_title,
      v_author_name || ': ' || left(new.body, 120),
      '/portal/engagements/' || new.engagement_id
    );
  end if;
  return new;
end;
$$;
create trigger trg_notify_message
  after insert on public.messages
  for each row execute function public.tg_notify_message();

-- Trigger: a new document uploaded by staff (or the system) notifies the org.
create or replace function public.tg_notify_document()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_uploader_role profile_role;
begin
  select role into v_uploader_role from public.profiles where id = new.uploaded_by;
  if new.uploaded_by is null or v_uploader_role in ('staff', 'admin') then
    perform public.notify_org_clients(
      new.org_id, 'document',
      'New document: ' || new.filename,
      null,
      case when new.engagement_id is not null
           then '/portal/engagements/' || new.engagement_id
           else '/portal' end,
      new.uploaded_by
    );
  end if;
  return new;
end;
$$;
create trigger trg_notify_document
  after insert on public.documents
  for each row execute function public.tg_notify_document();

-- Trigger: an invoice becoming sent or overdue notifies the org.
create or replace function public.tg_notify_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('sent', 'overdue')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.notify_org_clients(
      new.org_id, 'invoice',
      case when new.status = 'overdue'
           then 'Invoice ' || new.number || ' is overdue'
           else 'New invoice ' || new.number end,
      new.currency || ' ' || trim(to_char(new.amount, 'FM999999990.00')),
      '/portal/invoices',
      null
    );
  end if;
  return new;
end;
$$;
create trigger trg_notify_invoice
  after insert or update of status on public.invoices
  for each row execute function public.tg_notify_invoice();

-- Trigger: a milestone moving to done notifies the org.
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
      '/portal/engagements/' || new.engagement_id,
      null
    );
  end if;
  return new;
end;
$$;
create trigger trg_notify_milestone
  after update of status on public.milestones
  for each row execute function public.tg_notify_milestone();

-- Caller marks one of their notifications read.
create or replace function public.mark_notification_read(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'must be signed in'; end if;
  update public.notifications
     set read_at = now()
   where id = p_id and profile_id = auth.uid() and read_at is null;
end;
$$;

-- Caller marks all of their notifications read; returns how many changed.
create or replace function public.mark_all_notifications_read()
returns int language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if auth.uid() is null then raise exception 'must be signed in'; end if;
  update public.notifications
     set read_at = now()
   where profile_id = auth.uid() and read_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Caller's unread count (zero for non-active users).
create or replace function public.unread_notification_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.notifications
   where profile_id = auth.uid() and read_at is null
     and public.auth_is_active();
$$;

-- Internal helpers + trigger functions are not part of the public API at all.
-- Revoke from PUBLIC (not just anon): Postgres grants EXECUTE to PUBLIC on
-- creation, and anon/authenticated inherit it. Triggers still fire because they
-- run as the owning role, which always retains EXECUTE.
revoke all on function public.notify_org_clients(uuid, text, text, text, text, uuid) from public;
revoke all on function public.notify_profile(uuid, uuid, text, text, text, text) from public;
revoke all on function public.tg_notify_message() from public;
revoke all on function public.tg_notify_document() from public;
revoke all on function public.tg_notify_invoice() from public;
revoke all on function public.tg_notify_milestone() from public;

-- Client-facing RPCs: signed-in users only. Drop the PUBLIC grant (blocks anon)
-- then grant EXECUTE back to authenticated explicitly.
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.unread_notification_count() from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.unread_notification_count() to authenticated;
