create type engagement_status as enum ('active', 'on_hold', 'closed');
create type milestone_status  as enum ('todo', 'in_progress', 'done');
create type invoice_status    as enum ('draft', 'sent', 'paid', 'overdue');

create table public.engagements (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete cascade,
  title       text not null,
  summary     text,
  status      engagement_status not null default 'active',
  progress    int not null default 0 check (progress between 0 and 100),
  lead_id     uuid references public.profiles (id) on delete set null,
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now()
);
create index idx_engagements_org on public.engagements (org_id);

create table public.milestones (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  title         text not null,
  status        milestone_status not null default 'todo',
  due_date      date,
  sort          int not null default 0
);
create index idx_milestones_engagement on public.milestones (engagement_id);

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs (id) on delete cascade,
  engagement_id uuid references public.engagements (id) on delete set null,
  filename      text not null,
  storage_path  text not null,
  size_bytes    bigint not null default 0,
  uploaded_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index idx_documents_org on public.documents (org_id);

create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now()
);
create index idx_messages_engagement on public.messages (engagement_id);

create table public.invoices (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  number     text not null,
  amount     numeric(12,2) not null default 0,
  currency   text not null default 'USD',
  status     invoice_status not null default 'draft',
  due_date   date,
  pdf_path   text,
  created_at timestamptz not null default now()
);
create index idx_invoices_org on public.invoices (org_id);

create table public.invites (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  org_id      uuid not null references public.orgs (id) on delete cascade,
  email       text,
  expires_at  timestamptz not null,
  redeemed_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.access_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text,
  message    text,
  created_at timestamptz not null default now()
);
