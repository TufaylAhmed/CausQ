# CausQ Client Portal — Plan 01: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the portal application shell and a multi-tenant Postgres database whose per-organization isolation is enforced by Row-Level Security and proven by automated tests.

**Architecture:** A new Next.js (App Router, TypeScript) app lives in `portal/`, separate from the static marketing site. Supabase provides Postgres, Auth, and Storage. Every client-readable table carries an `org_id`; RLS policies use SECURITY DEFINER helper functions to scope reads/writes to the signed-in user's organization, with staff/admin allowed cross-org for administration. pgTAP tests prove that one org cannot see another's rows and that a pending user sees nothing.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + CLI + pgTAP), npm.

**Spec:** `docs/superpowers/specs/2026-06-07-causq-client-portal-design.md`

---

## File Structure

```
portal/
  package.json                      Next.js app manifest
  next.config.mjs
  tsconfig.json
  tailwind.config.ts
  src/
    app/
      layout.tsx                    root layout, brand fonts
      page.tsx                      placeholder landing ("Client portal")
      globals.css                   Tailwind + brand tokens
    lib/
      supabase/
        client.ts                   browser Supabase client
        server.ts                   server Supabase client (SSR cookies)
      types/
        database.types.ts           generated DB types (from Supabase)
  supabase/
    config.toml                     created by `supabase init`
    migrations/
      0001_core_enums_and_orgs.sql  enums, orgs, profiles
      0002_domain_tables.sql        engagements, milestones, documents,
                                    messages, invoices, invites, access_requests
      0003_auth_helpers.sql         SECURITY DEFINER helper functions
      0004_rls_policies.sql         enable RLS + policies for all tables
      0005_seed_dev.sql             dev/test seed data (guarded for local only)
    tests/
      rls_isolation.test.sql        pgTAP isolation tests
```

Conventions: SQL is split by responsibility (tables, then helpers, then policies) so each migration is reviewable on its own. Supabase clients are split browser vs server because they construct auth differently.

---

## Task 1: Scaffold the Next.js portal app

**Files:**
- Create: `portal/` (entire Next.js scaffold)

- [ ] **Step 1: Create the app**

Run from the repo root:

```bash
npx create-next-app@latest portal \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --no-turbopack
```

When prompted to proceed with package installation, accept defaults.

- [ ] **Step 2: Verify it builds**

Run:

```bash
cd portal && npm run build
```

Expected: build completes with "Compiled successfully" and a route list including `/`.

- [ ] **Step 3: Replace the landing page with a placeholder**

Overwrite `portal/src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan-600">
          CausQ
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Client portal</h1>
        <p className="mt-2 text-neutral-500">Foundation shell. Auth arrives in Plan 02.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify build still passes**

Run: `cd portal && npm run build`
Expected: "Compiled successfully".

- [ ] **Step 5: Commit**

```bash
git add portal
git commit -m "feat(portal): scaffold Next.js app shell"
```

---

## Task 2: Add shadcn/ui and brand tokens

**Files:**
- Modify: `portal/src/app/globals.css`
- Modify: `portal/src/app/layout.tsx`
- Create: shadcn config + `portal/src/components/ui/*` (via CLI)

- [ ] **Step 1: Initialize shadcn/ui**

Run from `portal/`:

```bash
npx shadcn@latest init -d
```

`-d` accepts defaults (New York style, neutral base, CSS variables). This creates `components.json` and updates `globals.css`.

- [ ] **Step 2: Add the components the portal will need across plans**

```bash
npx shadcn@latest add button card input table badge dialog dropdown-menu toast avatar
```

- [ ] **Step 3: Add brand fonts and accent token in `layout.tsx`**

Replace `portal/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Albert_Sans, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Albert_Sans({ subsets: ["latin"], variable: "--font-display" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "CausQ Client Portal",
  description: "Secure access to your CausQ engagements, documents, and invoices.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-[var(--font-body)] antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Set the teal accent in `globals.css`**

Append to `portal/src/app/globals.css`:

```css
:root {
  --brand: #06b6d4;
  --brand-deep: #0891b2;
}
.text-cyan-600 { color: var(--brand-deep); }
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 6: Commit**

```bash
git add portal
git commit -m "feat(portal): add shadcn/ui and brand fonts/tokens"
```

---

## Task 3: Initialize the local Supabase stack

**Files:**
- Create: `portal/supabase/config.toml` (via CLI)

- [ ] **Step 1: Initialize Supabase in the portal app**

Run from `portal/`:

```bash
npx supabase init
```

Answer "no" to generating VS Code settings if prompted.

- [ ] **Step 2: Start the local stack** (requires Docker running)

```bash
npx supabase start
```

Expected: prints local API URL, DB URL, Studio URL, anon key, and service_role key. Keep these for `.env.local` in Task 9.

- [ ] **Step 3: Confirm the DB is reachable**

```bash
npx supabase status
```

Expected: all services show as "RUNNING" / healthy.

- [ ] **Step 4: Commit**

```bash
git add portal/supabase/config.toml
git commit -m "chore(portal): initialize local Supabase stack"
```

---

## Task 4: Migration — core enums, orgs, profiles

**Files:**
- Create: `portal/supabase/migrations/0001_core_enums_and_orgs.sql`

- [ ] **Step 1: Create the migration file**

```bash
cd portal && npx supabase migration new core_enums_and_orgs
```

This creates a timestamped file. Put the following content in it (the plan refers to it as `0001_core_enums_and_orgs.sql`):

```sql
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
```

- [ ] **Step 2: Apply the migration to the local DB**

Run: `npx supabase db reset`
Expected: resets and applies all migrations; ends with "Finished supabase db reset".

- [ ] **Step 3: Verify the tables exist**

```bash
npx supabase db reset && \
psql "$(npx supabase status -o json | python3 -c 'import sys,json;print(json.load(sys.stdin)["DB_URL"])')" \
  -c "\dt public.*"
```

Expected: lists `orgs` and `profiles`.

- [ ] **Step 4: Commit**

```bash
git add portal/supabase/migrations
git commit -m "feat(portal): add orgs and profiles schema"
```

---

## Task 5: Migration — domain tables

**Files:**
- Create: `portal/supabase/migrations/0002_domain_tables.sql`

- [ ] **Step 1: Create the migration**

```bash
npx supabase migration new domain_tables
```

Content:

```sql
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
```

- [ ] **Step 2: Apply**

Run: `npx supabase db reset`
Expected: "Finished supabase db reset" with no errors.

- [ ] **Step 3: Commit**

```bash
git add portal/supabase/migrations
git commit -m "feat(portal): add engagements, documents, messages, invoices, invites, access_requests"
```

---

## Task 6: Migration — auth helper functions

These SECURITY DEFINER functions read the caller's profile while bypassing RLS, which prevents recursive policy evaluation on `profiles`.

**Files:**
- Create: `portal/supabase/migrations/0003_auth_helpers.sql`

- [ ] **Step 1: Create the migration**

```bash
npx supabase migration new auth_helpers
```

Content:

```sql
-- Returns the signed-in user's org_id, or null.
create or replace function public.auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

-- True when the signed-in user is an active client/staff/admin.
create or replace function public.auth_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

-- True when the signed-in user is active staff or admin (cross-org access).
create or replace function public.auth_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
      and role in ('staff', 'admin')
  );
$$;
```

- [ ] **Step 2: Apply**

Run: `npx supabase db reset`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add portal/supabase/migrations
git commit -m "feat(portal): add RLS auth helper functions"
```

---

## Task 7: Migration — enable RLS and policies

**Files:**
- Create: `portal/supabase/migrations/0004_rls_policies.sql`

- [ ] **Step 1: Create the migration**

```bash
npx supabase migration new rls_policies
```

Content:

```sql
-- Enable RLS on every table.
alter table public.orgs            enable row level security;
alter table public.profiles        enable row level security;
alter table public.engagements     enable row level security;
alter table public.milestones      enable row level security;
alter table public.documents       enable row level security;
alter table public.messages        enable row level security;
alter table public.invoices        enable row level security;
alter table public.invites         enable row level security;
alter table public.access_requests enable row level security;

-- profiles: a user can read/update their own row; staff can read all.
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid() or public.auth_is_staff());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_write on public.profiles
  for update using (public.auth_is_staff());

-- orgs: members of the org (active) can read it; staff read all.
create policy orgs_member_select on public.orgs
  for select using (public.auth_is_staff() or (id = public.auth_org_id() and public.auth_is_active()));

-- Shared predicate pattern: active member of the owning org, or staff.
create policy engagements_select on public.engagements
  for select using (public.auth_is_staff() or (org_id = public.auth_org_id() and public.auth_is_active()));

create policy milestones_select on public.milestones
  for select using (
    public.auth_is_staff() or exists (
      select 1 from public.engagements e
      where e.id = milestones.engagement_id
        and e.org_id = public.auth_org_id()
        and public.auth_is_active()
    )
  );

create policy documents_select on public.documents
  for select using (public.auth_is_staff() or (org_id = public.auth_org_id() and public.auth_is_active()));

create policy messages_select on public.messages
  for select using (
    public.auth_is_staff() or exists (
      select 1 from public.engagements e
      where e.id = messages.engagement_id
        and e.org_id = public.auth_org_id()
        and public.auth_is_active()
    )
  );
-- clients may post messages on their own engagements.
create policy messages_insert on public.messages
  for insert with check (
    author_id = auth.uid() and exists (
      select 1 from public.engagements e
      where e.id = messages.engagement_id
        and e.org_id = public.auth_org_id()
        and public.auth_is_active()
    )
  );

create policy invoices_select on public.invoices
  for select using (public.auth_is_staff() or (org_id = public.auth_org_id() and public.auth_is_active()));

-- invites and access_requests are staff-only via the API (service role).
create policy invites_staff_all on public.invites
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());
create policy access_requests_staff_select on public.access_requests
  for select using (public.auth_is_staff());

-- Staff full write on the content tables (admin area uses these).
create policy engagements_staff_write on public.engagements
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());
create policy milestones_staff_write on public.milestones
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());
create policy documents_staff_write on public.documents
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());
create policy invoices_staff_write on public.invoices
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());
create policy orgs_staff_write on public.orgs
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());
```

Note: `access_requests` inserts come from the public request form via the service role in Plan 02, so no anon insert policy is defined here by design.

- [ ] **Step 2: Apply**

Run: `npx supabase db reset`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add portal/supabase/migrations
git commit -m "feat(portal): enable RLS and per-org access policies"
```

---

## Task 8: pgTAP isolation tests (the security backbone)

This is the most important task in the plan. It proves cross-org isolation and the pending-user lockout.

**Files:**
- Create: `portal/supabase/tests/rls_isolation.test.sql`

- [ ] **Step 1: Write the failing test**

Create `portal/supabase/tests/rls_isolation.test.sql`:

```sql
begin;
select plan(6);

-- Seed two orgs and three users (no real auth.users needed for RLS checks;
-- we set request.jwt.claims.sub directly to simulate auth.uid()).
insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme',   '{acme.com}'),
  ('00000000-0000-0000-0000-0000000000b1', 'Globex', '{globex.com}');

insert into public.profiles (id, email, org_id, role, status) values
  ('00000000-0000-0000-0000-0000000000a2', 'amy@acme.com',   '00000000-0000-0000-0000-0000000000a1', 'client', 'active'),
  ('00000000-0000-0000-0000-0000000000b2', 'gil@globex.com', '00000000-0000-0000-0000-0000000000b1', 'client', 'active'),
  ('00000000-0000-0000-0000-0000000000c2', 'pat@acme.com',   '00000000-0000-0000-0000-0000000000a1', 'client', 'pending');

insert into public.engagements (id, org_id, title) values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'Acme engagement'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b1', 'Globex engagement');

insert into public.invoices (org_id, number, amount) values
  ('00000000-0000-0000-0000-0000000000a1', 'INV-A1', 100),
  ('00000000-0000-0000-0000-0000000000b1', 'INV-B1', 200);

-- Helper to act as a given user under the 'authenticated' role.
create or replace function tests.act_as(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

-- 1. Acme client sees only Acme engagements.
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select results_eq(
  'select count(*)::int from public.engagements',
  $$values (1)$$,
  'Acme client sees exactly one (their own) engagement'
);

-- 2. Acme client sees only Acme invoices.
select results_eq(
  'select number from public.invoices order by number',
  $$values ('INV-A1')$$,
  'Acme client sees only Acme invoices'
);

-- 3. Globex client sees only Globex engagements.
select tests.act_as('00000000-0000-0000-0000-0000000000b2');
select results_eq(
  'select title from public.engagements order by title',
  $$values ('Globex engagement')$$,
  'Globex client sees only Globex engagement'
);

-- 4. A pending Acme user sees nothing.
select tests.act_as('00000000-0000-0000-0000-0000000000c2');
select is(
  (select count(*)::int from public.engagements),
  0,
  'Pending user sees no engagements'
);
select is(
  (select count(*)::int from public.invoices),
  0,
  'Pending user sees no invoices'
);

-- 5. Globex client cannot read Acme rows even by direct id filter.
select tests.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  (select count(*)::int from public.engagements
   where id = '00000000-0000-0000-0000-0000000000a3'),
  0,
  'Globex client cannot read a specific Acme engagement by id'
);

select * from finish();
rollback;
```

- [ ] **Step 2: Run the test to verify the harness works and tests pass**

Run from `portal/`:

```bash
npx supabase test db
```

Expected: pgTAP reports `ok 1` through `ok 6` and a passing summary. If RLS were misconfigured, one or more would FAIL, which is the signal this task exists to catch.

- [ ] **Step 3: Sanity-check that the tests actually exercise RLS**

Temporarily weaken one policy to confirm the test catches it: edit `0004_rls_policies.sql` `engagements_select` USING clause to `using (true)`, run `npx supabase db reset && npx supabase test db`, and confirm test 1 and 3 now FAIL. Then revert the policy and re-run to confirm all pass again.

Expected after revert: all 6 `ok`.

- [ ] **Step 4: Commit**

```bash
git add portal/supabase/tests
git commit -m "test(portal): pgTAP RLS isolation tests for orgs/engagements/invoices"
```

---

## Task 9: Dev seed data and environment wiring

**Files:**
- Create: `portal/supabase/migrations/0005_seed_dev.sql`
- Create: `portal/.env.local`
- Create: `portal/.env.example`
- Modify: `portal/.gitignore` (ensure `.env.local` ignored, which create-next-app already does)

- [ ] **Step 1: Add a local-only seed migration**

```bash
npx supabase migration new seed_dev
```

Content (idempotent, safe to re-run on local resets):

```sql
insert into public.orgs (id, name, verified_domains)
values ('11111111-1111-1111-1111-111111111111', 'Demo Client', '{demo.test}')
on conflict (id) do nothing;

insert into public.engagements (id, org_id, title, summary, status, progress)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'Quantum readiness assessment',
        'Crypto-agility baseline and roadmap.',
        'active', 60)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply**

Run: `npx supabase db reset`
Expected: no errors; seed rows present.

- [ ] **Step 3: Create `.env.example`**

```bash
cat > .env.example <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EOF
```

- [ ] **Step 4: Create `.env.local` from the running stack**

Copy the API URL and anon/service keys printed by `npx supabase status` into `portal/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
```

- [ ] **Step 5: Confirm `.env.local` is gitignored**

Run: `git check-ignore portal/.env.local`
Expected: prints the path (meaning it is ignored).

- [ ] **Step 6: Commit (no secrets)**

```bash
git add portal/.env.example portal/supabase/migrations
git commit -m "chore(portal): dev seed data and env example"
```

---

## Task 10: Supabase client helpers and generated types

**Files:**
- Create: `portal/src/lib/supabase/client.ts`
- Create: `portal/src/lib/supabase/server.ts`
- Create: `portal/src/lib/types/database.types.ts`

- [ ] **Step 1: Install the Supabase client libraries**

Run from `portal/`:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Generate database types**

```bash
npx supabase gen types typescript --local > src/lib/types/database.types.ts
```

Expected: a TypeScript file exporting a `Database` type with `orgs`, `profiles`, `engagements`, etc.

- [ ] **Step 3: Add the browser client**

Create `portal/src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Add the server client**

Create `portal/src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component; safe to ignore (middleware refreshes)
          }
        },
      },
    }
  );
}
```

- [ ] **Step 5: Verify it builds and types resolve**

Run: `npm run build`
Expected: "Compiled successfully" with no type errors.

- [ ] **Step 6: Commit**

```bash
git add portal/src/lib portal/package.json portal/package-lock.json
git commit -m "feat(portal): Supabase browser/server clients and generated types"
```

---

## Task 11: End-to-end smoke route (proves RLS through the app)

A server route that reads engagements with the anon client (no session) must return zero rows, proving the app respects RLS by default. Real authenticated reads arrive in Plan 02.

**Files:**
- Create: `portal/src/app/api/smoke/route.ts`

- [ ] **Step 1: Write the route**

Create `portal/src/app/api/smoke/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("engagements").select("id");
  return NextResponse.json({ ok: !error, count: data?.length ?? 0 });
}
```

- [ ] **Step 2: Run the app and hit the route**

Run (in one terminal): `npm run dev`
In another: `curl -s localhost:3000/api/smoke`
Expected: `{"ok":true,"count":0}` — RLS denies the unauthenticated reader all rows, which is the correct secure default.

- [ ] **Step 3: Commit**

```bash
git add portal/src/app/api/smoke/route.ts
git commit -m "feat(portal): smoke route confirming RLS denies unauthenticated reads"
```

---

## Self-Review (completed during authoring)

- **Spec coverage (Plan 01 portion):** data model (Tasks 4-5), RLS isolation (Tasks 6-8), app shell + brand (Tasks 1-2), Supabase wiring (Tasks 3, 9-11). Auth flows, the four feature modules, admin, notifications, deploy, and Stripe are intentionally deferred to Plans 02-06 (see roadmap below). No Plan 01 requirement is unaddressed.
- **Placeholder scan:** no TBD/TODO; every code step contains real content.
- **Type/name consistency:** helper functions `auth_org_id()`, `auth_is_active()`, `auth_is_staff()` are defined in Task 6 and used verbatim in Tasks 7-8. Table/column names match between migrations, policies, tests, and generated types.

---

## Roadmap: subsequent plans (to be expanded on demand)

Each will be written to its own `docs/superpowers/plans/2026-06-07-causq-client-portal-0N-*.md` with the same TDD granularity.

- **Plan 02 — Auth & access.** Google + Microsoft (Azure) OAuth and email magic link via Supabase Auth; a profile-provisioning trigger; the signup→pending→approval state machine; domain-match suggestion; invite redemption; the public request-access form (service-role insert into `access_requests`); middleware for session refresh and route gating. Ships: users sign in and are correctly gated.
- **Plan 03 — Engagements & documents.** Authenticated engagement list/detail, milestone checklist, document area with Supabase Storage per-org bucket policies and short-lived signed URLs (staff upload, client download). Ships: a client can browse their engagements and download deliverables.
- **Plan 04 — Messaging, invoices, notifications.** Threaded per-engagement messages (client insert via `messages_insert`), invoice list with status badges and PDF download, and an Edge Function that sends notification email via the existing MailerSend sender. Ships: clients message their lead and view/download invoices.
- **Plan 05 — Admin area.** Role-gated `/admin`: approve/reject pending users, manage orgs and verified domains, CRUD engagements/milestones, upload documents, send invites, record invoices, triage access requests, with an admin action audit log. Ships: staff can fully operate the portal.
- **Plan 06 — Deploy.** Cloudflare Pages project for `portal.causq.com`, Supabase cloud project + migration push, OAuth provider setup (Google Cloud, Azure AD), env/secret configuration, and a "Client login" link added to the marketing nav/footer. Ships: portal live on its own subdomain.
- **Fast-follow — Stripe pay-now.** Stripe Checkout per invoice, webhook to flip `invoices.status` to `paid`. Ships: clients pay online.
