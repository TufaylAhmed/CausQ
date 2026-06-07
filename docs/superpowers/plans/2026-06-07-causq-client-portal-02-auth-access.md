# CausQ Client Portal — Plan 02: Auth & Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement task-by-task. Steps use checkbox (`- [ ]`).

**Goal:** Let clients sign in (email magic link now; Google/Microsoft wired for deploy), auto-provision a pending profile with domain-based org suggestion, gate the portal so only approved users see data, and support staff approval, invite redemption, and a public request-access form.

**Architecture:** Supabase Auth issues sessions. A `handle_new_user` trigger creates a `profiles` row (status `pending`) and matches the email domain to an org. A guard trigger blocks clients from changing privileged fields (`status`/`role`/`org_id`). Next.js middleware refreshes the session and gates `/portal/**`. Privileged writes (approval, invite redemption, request-access insert) go through a server-only service-role client.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr`, Supabase Auth + pgTAP, Tailwind v4 + shadcn/ui.

**Builds on:** Plan 01 (`feat/client-portal`). Spec: `docs/superpowers/specs/2026-06-07-causq-client-portal-design.md`.

---

## File Structure

```
portal/
  supabase/
    config.toml                          enable email auth; declare Google/Azure (deploy)
    migrations/
      20260607130000_profile_triggers.sql  handle_new_user + domain match + escalation guard
      20260607130100_access_rpcs.sql        approve_profile, redeem_invite (security definer)
    tests/
      auth_provisioning.test.sql            pgTAP: trigger, domain match, escalation guard, RPCs
  src/
    lib/supabase/
      admin.ts                           service-role client (server-only)
      middleware.ts                      session refresh + gating helper
    middleware.ts                        Next.js middleware entry
    app/
      portal/
        layout.tsx                       authed shell (redirects per status)
        page.tsx                         minimal dashboard: lists the user's engagements
        pending/page.tsx                 "awaiting approval" state
        login/page.tsx                   email magic link + Google/MS buttons
        login/actions.ts                 server action: send magic link
        request-access/page.tsx          public form
        request-access/actions.ts        server action: insert access_request (service role)
        invite/page.tsx                  redeem invite by token
        invite/actions.ts                server action: redeem_invite
      auth/callback/route.ts             exchanges OAuth/magic-link code for a session
```

---

## Task 1: Supabase auth configuration

**Files:** Modify `portal/supabase/config.toml`

- [ ] **Step 1:** In `[auth]` ensure `site_url = "http://127.0.0.1:3000"` and add `"http://127.0.0.1:3000/auth/callback"` to `additional_redirect_urls`.
- [ ] **Step 2:** Under `[auth.email]` set `enable_signup = true`, `enable_confirmations = false` (magic-link/OTP path; no password).
- [ ] **Step 3:** Append provider blocks (kept disabled locally; deploy flips them on with real creds):

```toml
[auth.external.google]
enabled = false
client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_GOOGLE_SECRET)"

[auth.external.azure]
enabled = false
client_id = "env(SUPABASE_AUTH_AZURE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_AZURE_SECRET)"
url = "env(SUPABASE_AUTH_AZURE_URL)"
```

- [ ] **Step 4:** `npx supabase stop && npx supabase start` to load config. Expected: starts cleanly.
- [ ] **Step 5:** Commit: `chore(portal): enable email auth, declare OAuth providers`.

---

## Task 2: Profile provisioning + escalation guard (migration)

**Files:** Create `portal/supabase/migrations/20260607130000_profile_triggers.sql`

- [ ] **Step 1:** Write the migration:

```sql
-- Auto-create a pending profile on signup; match email domain to an org.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := lower(split_part(new.email, '@', 2));
  v_org    uuid;
begin
  select id into v_org from public.orgs
   where v_domain = any (verified_domains)
   limit 1;

  insert into public.profiles (id, email, name, org_id, role, status)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name', v_org, 'client', 'pending')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block clients from changing privileged fields; staff and service role may.
create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.auth_is_staff() then
    if new.status is distinct from old.status
       or new.role  is distinct from old.role
       or new.org_id is distinct from old.org_id then
      raise exception 'cannot modify privileged profile fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_fields on public.profiles;
create trigger trg_guard_profile_fields
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();
```

- [ ] **Step 2:** `npx supabase db reset`. Expected: applies cleanly.
- [ ] **Step 3:** Commit: `feat(portal): profile provisioning trigger + privilege-escalation guard`.

---

## Task 3: Access RPCs (migration)

**Files:** Create `portal/supabase/migrations/20260607130100_access_rpcs.sql`

- [ ] **Step 1:** Write:

```sql
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
```

- [ ] **Step 2:** `npx supabase db reset`. Expected: clean.
- [ ] **Step 3:** Commit: `feat(portal): approve_profile and redeem_invite RPCs`.

---

## Task 4: pgTAP tests for provisioning, guard, and RPCs

**Files:** Create `portal/supabase/tests/auth_provisioning.test.sql`

- [ ] **Step 1:** Write the test (8 assertions):

```sql
begin;
select plan(8);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}');

-- Domain match: signup with acme.com -> profile pending, org = Acme.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com');
select is((select org_id from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
          '00000000-0000-0000-0000-0000000000a1', 'domain match sets org');
select is((select status::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
          'pending', 'new profile is pending');

-- Unknown domain: no org.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000z2', 'authenticated', 'authenticated', 'zoe@unknown.io');
select is((select org_id from public.profiles where id = '00000000-0000-0000-0000-0000000000z2'),
          null, 'unknown domain leaves org null');

-- Escalation guard: a pending client cannot self-activate.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000a2'$$,
  'cannot modify privileged profile fields',
  'client cannot self-activate'
);
-- but may change their own name.
select lives_ok(
  $$update public.profiles set name = 'Amy A.' where id = '00000000-0000-0000-0000-0000000000a2'$$,
  'client may edit their own name'
);

-- approve_profile is staff-only.
select throws_ok(
  $$select public.approve_profile('00000000-0000-0000-0000-0000000000a2')$$,
  'forbidden',
  'non-staff cannot approve'
);

-- Make a2 staff (as superuser) then approve z2.
reset role;
update public.profiles set role = 'staff', status = 'active' where id = '00000000-0000-0000-0000-0000000000a2';
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$select public.approve_profile('00000000-0000-0000-0000-0000000000z2','00000000-0000-0000-0000-0000000000a1')$$,
  'staff can approve a pending user'
);
select is(
  (select status::text from public.profiles where id = '00000000-0000-0000-0000-0000000000z2'),
  'active',
  'approved user becomes active'
);

select * from finish();
rollback;
```

- [ ] **Step 2:** `npx supabase test db`. Expected: both test files pass (6 + 8).
- [ ] **Step 3:** Commit: `test(portal): auth provisioning, escalation guard, RPC tests`.

---

## Task 5: Server-only service-role client

**Files:** Create `portal/src/lib/supabase/admin.ts`

- [ ] **Step 1:** Write:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Service-role client. Bypasses RLS. NEVER import into client components.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

- [ ] **Step 2:** `npm install server-only`.
- [ ] **Step 3:** Commit: `feat(portal): server-only service-role Supabase client`.

---

## Task 6: Middleware (session refresh + gating)

**Files:** Create `portal/src/lib/supabase/middleware.ts` and `portal/src/middleware.ts`

- [ ] **Step 1:** Create `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/portal") && !path.startsWith("/portal/login");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal/login";
    return NextResponse.redirect(url);
  }
  return response;
}
```

- [ ] **Step 2:** Create `src/middleware.ts`:

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/portal/:path*"],
};
```

- [ ] **Step 3:** `npm run build`. Expected: compiles.
- [ ] **Step 4:** Commit: `feat(portal): session-refresh middleware with /portal gating`.

---

## Task 7: Auth callback route

**Files:** Create `portal/src/app/auth/callback/route.ts`

- [ ] **Step 1:** Write:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/portal";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/portal/login?error=auth`);
}
```

- [ ] **Step 2:** `npm run build`. Expected: compiles.
- [ ] **Step 3:** Commit: `feat(portal): auth callback code-exchange route`.

---

## Task 8: Login page + magic-link action + OAuth buttons

**Files:** Create `portal/src/app/portal/login/page.tsx`, `portal/src/app/portal/login/actions.ts`

- [ ] **Step 1:** `src/app/portal/login/actions.ts`:

```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://127.0.0.1:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  return error ? { error: error.message } : { sent: true };
}
```

- [ ] **Step 2:** `src/app/portal/login/page.tsx` (client component): an email input calling `sendMagicLink`, plus Google/Microsoft buttons calling `supabase.auth.signInWithOAuth({ provider, options:{ redirectTo: location.origin + '/auth/callback' }})` via the browser client. Show "check your email" on `sent`. Use shadcn `Button`/`Input`/`Card`. (Full component code: see implementation; copy below.)

```tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMagicLink } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function oauth(provider: "google" | "azure") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="font-mono text-xs uppercase tracking-widest text-brand-deep">CausQ</p>
          <CardTitle>Sign in to the portal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <p className="text-sm text-neutral-600">Check your email for a sign-in link.</p>
          ) : (
            <form
              action={async (fd) => {
                const r = await sendMagicLink(fd);
                if (r?.error) setError(r.error);
                else setSent(true);
              }}
              className="space-y-3"
            >
              <Input name="email" type="email" placeholder="you@company.com" required />
              <Button type="submit" className="w-full">Email me a sign-in link</Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          )}
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />or<span className="h-px flex-1 bg-neutral-200" />
          </div>
          <Button variant="outline" className="w-full" onClick={() => oauth("google")}>Continue with Google</Button>
          <Button variant="outline" className="w-full" onClick={() => oauth("azure")}>Continue with Microsoft</Button>
          <p className="text-center text-xs text-neutral-500">
            No account? <a className="underline" href="/portal/request-access">Request access</a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3:** `npm run build`. Expected: compiles.
- [ ] **Step 4:** Commit: `feat(portal): login page with magic link and OAuth buttons`.

---

## Task 9: Authed portal shell, dashboard, and pending page

**Files:** Create `portal/src/app/portal/layout.tsx`, `portal/src/app/portal/page.tsx`, `portal/src/app/portal/pending/page.tsx`

- [ ] **Step 1:** `src/app/portal/layout.tsx` (server): load user + profile; if no user redirect to login; if profile status != active and path isn't pending, redirect to `/portal/pending`. Render children.

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  return <div className="min-h-screen p-6">{children}</div>;
}
```

- [ ] **Step 2:** `src/app/portal/page.tsx` (server): fetch engagements (RLS-scoped) and render. If the profile is pending, RLS returns none, so show an approval hint with a link to `/portal/pending`.

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PortalHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user!.id).single();
  if (profile?.status !== "active") redirect("/portal/pending");

  const { data: engagements } = await supabase
    .from("engagements")
    .select("id, title, status, progress")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Your engagements</h1>
      <ul className="space-y-2">
        {(engagements ?? []).map((e) => (
          <li key={e.id} className="rounded border p-3">
            <div className="font-medium">{e.title}</div>
            <div className="text-sm text-neutral-500">{e.status} · {e.progress}%</div>
          </li>
        ))}
        {(!engagements || engagements.length === 0) && (
          <li className="text-sm text-neutral-500">No engagements yet.</li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3:** `src/app/portal/pending/page.tsx`:

```tsx
export default function PendingPage() {
  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-brand-deep">CausQ</p>
        <h1 className="mt-2 text-2xl font-semibold">Awaiting approval</h1>
        <p className="mt-2 max-w-md text-neutral-500">
          Your account is being reviewed. You will get access once a CausQ administrator approves it.
          Have an invite code? <a className="underline" href="/portal/invite">Redeem it here</a>.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4:** `npm run build`. Expected: compiles.
- [ ] **Step 5:** Commit: `feat(portal): authed shell, engagements dashboard, pending page`.

---

## Task 10: Request-access form (public, service-role insert)

**Files:** Create `portal/src/app/portal/request-access/page.tsx`, `portal/src/app/portal/request-access/actions.ts`

- [ ] **Step 1:** `actions.ts`:

```ts
"use server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requestAccess(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;
  if (!name || !email) return { error: "Name and email are required." };

  const admin = createAdminClient();
  const { error } = await admin.from("access_requests").insert({ name, email, company, message });
  return error ? { error: error.message } : { ok: true };
}
```

- [ ] **Step 2:** `page.tsx` (client): a small form (name, email, company, message) calling `requestAccess`, showing a thank-you on success. Mirror the login card styling. (Component code mirrors Task 8 patterns with `Input`/`Button`/`Card` and a `<textarea>` for message.)

```tsx
"use client";
import { useState } from "react";
import { requestAccess } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RequestAccessPage() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="font-mono text-xs uppercase tracking-widest text-brand-deep">CausQ</p>
          <CardTitle>Request portal access</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm text-neutral-600">Thanks. A CausQ administrator will be in touch to set up your account.</p>
          ) : (
            <form
              action={async (fd) => {
                const r = await requestAccess(fd);
                if (r?.error) setError(r.error);
                else setDone(true);
              }}
              className="space-y-3"
            >
              <Input name="name" placeholder="Your name" required />
              <Input name="email" type="email" placeholder="you@company.com" required />
              <Input name="company" placeholder="Company" />
              <textarea name="message" placeholder="What do you need access to?" className="w-full rounded border p-2 text-sm" rows={3} />
              <Button type="submit" className="w-full">Request access</Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3:** `npm run build`. Expected: compiles.
- [ ] **Step 4:** Commit: `feat(portal): public request-access form via service role`.

---

## Task 11: Invite redemption page

**Files:** Create `portal/src/app/portal/invite/page.tsx`, `portal/src/app/portal/invite/actions.ts`

- [ ] **Step 1:** `actions.ts`:

```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function redeemInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { error: "Enter your invite code." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_invite", { p_token: token });
  if (error) return { error: error.message };
  redirect("/portal");
}
```

- [ ] **Step 2:** `page.tsx` (client): single token input calling `redeemInvite`; mirrors login card. (Component follows Task 8 pattern.)

```tsx
"use client";
import { useState } from "react";
import { redeemInvite } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvitePage() {
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="font-mono text-xs uppercase tracking-widest text-brand-deep">CausQ</p>
          <CardTitle>Redeem an invite</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              const r = await redeemInvite(fd);
              if (r?.error) setError(r.error);
            }}
            className="space-y-3"
          >
            <Input name="token" placeholder="Invite code" required />
            <Button type="submit" className="w-full">Redeem</Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3:** `npm run build`. Expected: compiles.
- [ ] **Step 4:** Commit: `feat(portal): invite redemption page`.

---

## Task 12: End-to-end magic-link smoke (manual, scripted)

**Files:** none (verification)

- [ ] **Step 1:** Start the app and Supabase. Run `npm run dev`.
- [ ] **Step 2:** Trigger a magic link for a seeded-domain user and confirm Mailpit received it:

```bash
curl -s -X POST "http://127.0.0.1:54321/auth/v1/otp" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"amy@demo.test","create_user":true}'
# then check Mailpit
curl -s "http://127.0.0.1:54324/api/v1/messages" | head -c 400
```

Expected: an OTP/magic-link email appears in Mailpit; a `profiles` row for `amy@demo.test` exists with `status='pending'` and `org_id` = Demo Client (domain `demo.test` from Plan 01 seed).

- [ ] **Step 3:** Verify provisioning landed:

```bash
docker exec -i supabase_db_portal psql -U postgres -d postgres -c \
"select email, status, org_id from public.profiles where email='amy@demo.test';"
```

Expected: one row, `pending`, org_id non-null.

- [ ] **Step 4:** Stop dev server. Commit nothing (verification only).

---

## Self-Review (completed during authoring)

- **Spec coverage:** email auth (Tasks 1, 8); Google/MS wiring (Tasks 1, 8; live verify deferred to deploy Plan 06); self-signup + domain match + pending (Tasks 2, 9); staff approval (Task 3); invite redemption (Tasks 3, 11); request-access form (Task 10); gating (Tasks 6, 9). Security fix for self-update escalation (Task 2).
- **Placeholder scan:** all code present; the "mirrors Task 8" notes are accompanied by full component code.
- **Type/name consistency:** RPC names `approve_profile`/`redeem_invite` and params `p_token`/`p_id`/`p_org` match between migration, tests, and server actions. Client/admin/server helpers match Plan 01 exports.

---

## Deferred to later plans
- Live Google/Microsoft OAuth round-trip requires real provider credentials and redirect URLs (Plan 06 deploy).
- Sending the approval/notification emails via MailerSend (Plan 04).
- Staff UI to call `approve_profile` and manage invites (Plan 05 admin).
