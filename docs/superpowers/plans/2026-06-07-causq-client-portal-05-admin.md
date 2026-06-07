# CausQ Client Portal — Plan 05: Admin Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** CausQ staff can operate the portal: approve/reject pending users, manage orgs and verified domains, create engagements and milestones, send invites, record invoices, and triage access requests, with an audit log.

**Architecture:** A role-gated `/admin` section. Most writes use the staff-authenticated server client (RLS already permits staff writes from Plans 01-02). Token generation, the audit log, and rejection go through SECURITY DEFINER RPCs (`create_invite`, `log_admin_action`, `reject_profile`). A seeded `admin@causq.com` user makes the area usable locally.

**Tech Stack:** Next.js 16 App Router, Supabase + pgTAP.

**Builds on:** Plans 01-04 (`feat/client-portal`).

---

## File Structure

```
portal/supabase/migrations/20260607160000_admin.sql   admin_audit + RPCs
portal/supabase/seed.sql                               (modify) seed admin user + a pending user + access request
portal/supabase/tests/admin.test.sql                   pgTAP: RPC staff-gating + invite/audit/reject
portal/src/app/admin/
  layout.tsx                                           role gate + nav
  page.tsx                                             overview + pending approvals
  actions.ts                                           server actions (approve/reject/create org/eng/milestone/invoice)
  orgs/page.tsx                                         orgs + verified domains
  engagements/page.tsx                                 create engagement + add milestone
  invites/page.tsx + InviteCreator.tsx                 create invite (shows token) + list
  invoices/page.tsx                                    record invoice + list
  requests/page.tsx                                    access requests + convert to invite
```

---

## Task 1: Admin migration (audit + RPCs)

**Files:** Create `portal/supabase/migrations/20260607160000_admin.sql`

- [ ] **Step 1:** Write:

```sql
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
```

- [ ] **Step 2:** `npx supabase db reset`. Expected: clean.
- [ ] **Step 3:** Commit: `feat(portal): admin audit log + create_invite/reject_profile/log RPCs`.

---

## Task 2: Seed admin + pending user + an access request

**Files:** Modify `portal/supabase/seed.sql`

- [ ] **Step 1:** Append:

```sql
-- Admin user (sign in locally via magic link to admin@causq.com).
insert into auth.users (id, aud, role, email) values
  ('99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated', 'admin@causq.com')
on conflict (id) do nothing;
insert into public.profiles (id, email, name, role, status)
values ('99999999-9999-9999-9999-999999999999', 'admin@causq.com', 'CausQ Admin', 'admin', 'active')
on conflict (id) do update set role = 'admin', status = 'active', name = 'CausQ Admin';

-- A pending client to approve, and an access request to triage.
insert into auth.users (id, aud, role, email) values
  ('88888888-8888-8888-8888-888888888888', 'authenticated', 'authenticated', 'pat@demo.test')
on conflict (id) do nothing;
insert into public.access_requests (name, email, company, message)
values ('Riya Prospect', 'riya@prospect.io', 'Prospect Co', 'Interested in a quantum readiness engagement.')
on conflict do nothing;
```

- [ ] **Step 2:** `npx supabase db reset`. Expected: clean; `pat@demo.test` is a pending client (domain-matched to Demo Client via trigger).
- [ ] **Step 3:** Commit: `chore(portal): seed admin user, a pending client, and an access request`.

---

## Task 3: Admin pgTAP test

**Files:** Create `portal/supabase/tests/admin.test.sql`

- [ ] **Step 1:** Write (6 assertions):

```sql
begin;
select plan(6);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}');

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'sam@causq.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com');

set local "request.jwt.claims" to '{}';
update public.profiles set role = 'admin', status = 'active', org_id = null where id = '00000000-0000-0000-0000-0000000000c2';
update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000a2';

-- Non-staff client is forbidden from admin RPCs.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$select public.create_invite('00000000-0000-0000-0000-0000000000a1', 'x@acme.com')$$,
  'forbidden', 'client cannot create invite');
select throws_ok(
  $$select public.log_admin_action('test')$$, 'forbidden', 'client cannot write audit');

-- Staff/admin can.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select isnt(
  (select public.create_invite('00000000-0000-0000-0000-0000000000a1', 'newclient@acme.com')),
  null, 'admin create_invite returns a token');
select is(
  (select count(*)::int from public.invites where org_id = '00000000-0000-0000-0000-0000000000a1'),
  1, 'invite row created');
select lives_ok(
  $$select public.reject_profile('00000000-0000-0000-0000-0000000000a2')$$,
  'admin can reject a profile');
select is(
  (select status::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  'rejected', 'profile becomes rejected');

select * from finish();
rollback;
```

- [ ] **Step 2:** `npx supabase test db`. Expected: all pass (now 30 total).
- [ ] **Step 3:** Commit: `test(portal): admin RPC staff-gating pgTAP`.

---

## Task 4: Admin layout (role gate) + nav

**Files:** Create `portal/src/app/admin/layout.tsx`

- [ ] **Step 1:** Write:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const { data: me } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (!me || me.status !== "active" || !["staff", "admin"].includes(me.role)) redirect("/portal");

  const nav = [
    ["Overview", "/admin"],
    ["Orgs", "/admin/orgs"],
    ["Engagements", "/admin/engagements"],
    ["Invites", "/admin/invites"],
    ["Invoices", "/admin/invoices"],
    ["Requests", "/admin/requests"],
  ];
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex flex-wrap items-center gap-4 border-b pb-3">
        <span className="font-mono text-xs uppercase tracking-widest text-brand-deep">CausQ admin</span>
        <nav className="flex flex-wrap gap-3 text-sm">
          {nav.map(([label, href]) => (
            <a key={href} href={href} className="text-neutral-600 hover:text-brand-deep">{label}</a>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 2:** `npm run build`. Expected: compiles.
- [ ] **Step 3:** Commit: `feat(portal): role-gated /admin layout and nav`.

---

## Task 5: Server actions

**Files:** Create `portal/src/app/admin/actions.ts`

- [ ] **Step 1:** Write (each uses the staff-authed client; RLS enforces staff; audit logged):

```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function staffClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function approveUser(formData: FormData) {
  const id = String(formData.get("id"));
  const org = String(formData.get("org_id") || "") || null;
  const { supabase } = await staffClient();
  const { error } = await supabase.rpc("approve_profile", { p_id: id, p_org: org });
  if (error) throw new Error(error.message);
  await supabase.rpc("log_admin_action", { p_action: "approve_profile", p_target: id, p_detail: {} });
  revalidatePath("/admin");
}

export async function rejectUser(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await staffClient();
  const { error } = await supabase.rpc("reject_profile", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createOrg(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const domains = String(formData.get("domains") || "")
    .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (!name) throw new Error("Name required.");
  const { supabase } = await staffClient();
  const { error } = await supabase.from("orgs").insert({ name, verified_domains: domains });
  if (error) throw new Error(error.message);
  await supabase.rpc("log_admin_action", { p_action: "create_org", p_target: name, p_detail: {} });
  revalidatePath("/admin/orgs");
}

export async function updateOrgDomains(formData: FormData) {
  const id = String(formData.get("id"));
  const domains = String(formData.get("domains") || "")
    .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const { supabase } = await staffClient();
  const { error } = await supabase.from("orgs").update({ verified_domains: domains }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/orgs");
}

export async function createEngagement(formData: FormData) {
  const org_id = String(formData.get("org_id"));
  const title = String(formData.get("title") || "").trim();
  const summary = String(formData.get("summary") || "").trim() || null;
  if (!title) throw new Error("Title required.");
  const { supabase } = await staffClient();
  const { error } = await supabase.from("engagements").insert({ org_id, title, summary });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/engagements");
}

export async function addMilestone(formData: FormData) {
  const engagement_id = String(formData.get("engagement_id"));
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title required.");
  const { supabase } = await staffClient();
  const { error } = await supabase.from("milestones").insert({ engagement_id, title });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/engagements");
}

export async function createInvoice(formData: FormData) {
  const org_id = String(formData.get("org_id"));
  const number = String(formData.get("number") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const due_date = String(formData.get("due_date") || "") || null;
  if (!number) throw new Error("Invoice number required.");
  const { supabase } = await staffClient();
  const { error } = await supabase.from("invoices").insert({ org_id, number, amount, due_date, status: "sent" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/invoices");
}
```

- [ ] **Step 2:** Commit: `feat(portal): admin server actions`.

---

## Task 6: Overview page (pending approvals)

**Files:** Create `portal/src/app/admin/page.tsx`

- [ ] **Step 1:** Write: list pending profiles with approve/reject `<form>`s, plus counts.

```tsx
import { createClient } from "@/lib/supabase/server";
import { approveUser, rejectUser } from "./actions";
import { Button } from "@/components/ui/button";

export default async function AdminOverview() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("profiles").select("id, email, name, org_id, status")
    .eq("status", "pending").order("created_at");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pending approvals</h1>
      <ul className="space-y-2">
        {(pending ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded border p-3">
            <div className="text-sm">
              <div className="font-medium">{p.name ?? p.email}</div>
              <div className="text-neutral-500">{p.email} · org {p.org_id ?? "unmatched"}</div>
            </div>
            <div className="flex gap-2">
              <form action={approveUser}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="org_id" value={p.org_id ?? ""} />
                <Button size="sm" type="submit">Approve</Button>
              </form>
              <form action={rejectUser}>
                <input type="hidden" name="id" value={p.id} />
                <Button size="sm" variant="outline" type="submit">Reject</Button>
              </form>
            </div>
          </li>
        ))}
        {(!pending || pending.length === 0) && <li className="text-sm text-neutral-500">Nothing pending.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2:** `npm run build`. Commit: `feat(portal): admin overview with pending approvals`.

---

## Task 7: Orgs, Engagements, Invoices, Requests pages + Invites

**Files:** Create the remaining admin pages.

- [ ] **Step 1:** `orgs/page.tsx`: list orgs with a domains-edit `<form action={updateOrgDomains}>` (comma-separated), plus a create-org form (`createOrg`).
- [ ] **Step 2:** `engagements/page.tsx`: list engagements (join org name), a create-engagement form (org select + title + summary), and per-engagement add-milestone form.
- [ ] **Step 3:** `invoices/page.tsx`: list invoices (org + number + amount + status) and a create-invoice form.
- [ ] **Step 4:** `requests/page.tsx`: list `access_requests`; each row links to `/admin/invites?email=<email>` to convert.
- [ ] **Step 5:** `invites/InviteCreator.tsx` (client): org select + email, calls a `createInviteAction` that returns the token; display it. `invites/page.tsx` lists existing invites and renders `InviteCreator`. Add `createInviteAction` to `actions.ts`:

```ts
export async function createInviteAction(formData: FormData) {
  const org_id = String(formData.get("org_id"));
  const email = String(formData.get("email") || "").trim() || null;
  const { supabase } = await staffClient();
  const { data, error } = await supabase.rpc("create_invite", { p_org: org_id, p_email: email, p_days: 14 });
  if (error) return { error: error.message };
  return { token: data as string };
}
```

(Full component code for each page follows the table+form patterns above; org `<select>` is populated from `supabase.from("orgs").select("id,name")`.)

- [ ] **Step 6:** `npm run build`. Expected: compiles. Commit: `feat(portal): admin orgs, engagements, invoices, requests, invites pages`.

---

## Task 8: Verification

- [ ] **Step 1:** `npx supabase test db` → 30/30.
- [ ] **Step 2:** `npm run build` passes; push to update PR #1.
- [ ] **Step 3:** (manual) Sign in as `admin@causq.com` via magic link; approve `pat@demo.test`; create an invite; confirm token shows.

---

## Self-Review (completed during authoring)
- **Spec coverage:** approvals (Tasks 5-6), orgs+domains (Task 7), engagements+milestones (Task 7), invites (Tasks 1,7), invoices (Task 7), request triage (Task 7), audit log (Task 1, logged from actions). Seeded admin enables use.
- **Placeholder scan:** Task 7 describes per-page forms with the shared table+form pattern and gives the one non-obvious action (`createInviteAction`); pages are mechanical applications of the Task 6 pattern.
- **Type/name consistency:** RPC names/params (`create_invite(p_org,p_email,p_days)`, `reject_profile(p_id)`, `log_admin_action(p_action,p_target,p_detail)`) match migration, test, and actions.

## Deferred
- Audit log viewer UI; access-request delete/archive; richer engagement editing (status/progress inline); pagination.
