-- Phase 4: lightweight CRM. Contacts (clients see their CausQ team only),
-- opportunities (staff only), and a staff activity timeline.

create type opportunity_stage as enum ('lead', 'qualified', 'proposal', 'won', 'lost');

-- Contacts ----------------------------------------------------------------
create table public.contacts (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs (id) on delete cascade,
  name           text not null,
  email          text,
  role           text,
  is_causq_staff boolean not null default false,
  profile_id     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index idx_contacts_org on public.contacts (org_id);

alter table public.contacts enable row level security;

-- Clients see only the CausQ team assigned to their org; staff see all.
create policy contacts_select on public.contacts
  for select using (
    public.auth_is_staff()
    or (org_id = public.auth_org_id() and public.auth_is_active() and is_causq_staff = true)
  );
create policy contacts_staff_write on public.contacts
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());

-- Opportunities (staff only) ---------------------------------------------
create table public.opportunities (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs (id) on delete cascade,
  title            text not null,
  stage            opportunity_stage not null default 'lead',
  value            numeric(12,2) not null default 0,
  currency         text not null default 'USD',
  expected_close   date,
  owner_profile_id uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index idx_opportunities_org on public.opportunities (org_id);

alter table public.opportunities enable row level security;

create policy opportunities_staff_all on public.opportunities
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());

-- Activity log (staff timeline) ------------------------------------------
create table public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  kind       text not null,
  summary    text not null,
  actor_id   uuid references public.profiles (id) on delete set null,
  ref        text,
  created_at timestamptz not null default now()
);
create index idx_activity_org on public.activity_log (org_id);

alter table public.activity_log enable row level security;

create policy activity_staff_all on public.activity_log
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());
