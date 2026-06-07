-- Enums --------------------------------------------------------------------
create type profile_role   as enum ('client', 'staff', 'admin');
create type profile_status as enum ('pending', 'active', 'rejected');

-- Organizations ------------------------------------------------------------
create table public.orgs (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  verified_domains text[] not null default '{}',
  status           text not null default 'active',
  created_at       timestamptz not null default now()
);

-- Profiles (one per auth user) --------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  email      text not null,
  org_id     uuid references public.orgs (id) on delete set null,
  role       profile_role   not null default 'client',
  status     profile_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index idx_profiles_org on public.profiles (org_id);
