# CausQ Client Portal — Plan 04: Messaging, Invoices & Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Clients and their lead exchange threaded messages per engagement; clients view and download invoices; a new message notifies the other side by email.

**Architecture:** Messaging goes through two SECURITY DEFINER RPCs (`post_message`, `engagement_messages`) that check engagement access and join author names without exposing the `profiles` table broadly (and let staff, who have no `org_id`, participate). Invoices reuse the `documents` storage bucket under `{org_id}/invoices/...`. Notifications post to MailerSend from a server action, no-op when `MAILERSEND_API_KEY` is unset.

**Tech Stack:** Next.js 16 App Router, Supabase + pgTAP, MailerSend REST.

**Builds on:** Plans 01-03 (`feat/client-portal`).

---

## File Structure

```
portal/supabase/migrations/
  20260607150000_messaging.sql        post_message + engagement_messages RPCs
portal/supabase/seed.sql              (modify) seed invoices + a demo message
portal/supabase/tests/
  messaging.test.sql                  pgTAP: post/read access control + author join
portal/src/lib/notify.ts              MailerSend helper (server-only, env-guarded)
portal/src/app/portal/engagements/[id]/
  page.tsx                            (modify) render messages thread + composer
  messages-actions.ts                 sendMessage server action (RPC + notify)
  MessageComposer.tsx                 client composer
portal/src/app/portal/
  page.tsx                            (modify) add "Invoices" link
  invoices/page.tsx                   invoices list
  invoices/InvoiceDownload.tsx        signed-URL download button
```

---

## Task 1: Messaging RPCs (migration)

**Files:** Create `portal/supabase/migrations/20260607150000_messaging.sql`

- [ ] **Step 1:** Write:

```sql
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
```

- [ ] **Step 2:** `npx supabase db reset`. Expected: clean.
- [ ] **Step 3:** Commit: `feat(portal): messaging RPCs (post_message, engagement_messages)`.

---

## Task 2: Seed invoices + a demo message

**Files:** Modify `portal/supabase/seed.sql`

- [ ] **Step 1:** Append:

```sql
insert into public.invoices (id, org_id, number, amount, currency, status, due_date, pdf_path) values
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111',
   'INV-1042', 24000, 'USD', 'paid', '2026-04-30',
   '11111111-1111-1111-1111-111111111111/invoices/INV-1042.pdf'),
  ('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111',
   'INV-1051', 18000, 'USD', 'sent', '2026-06-15', null)
on conflict (id) do nothing;
```

- [ ] **Step 2:** `npx supabase db reset`. Expected: clean.
- [ ] **Step 3:** Commit: `chore(portal): seed demo invoices`.

---

## Task 3: Messaging pgTAP test

**Files:** Create `portal/supabase/tests/messaging.test.sql`

- [ ] **Step 1:** Write (6 assertions):

```sql
begin;
select plan(6);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}'),
  ('00000000-0000-0000-0000-0000000000b1', 'Globex', '{globex.com}');

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'gil@globex.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'sam@causq.com');

-- (profiles auto-created pending via trigger; set up roles as superuser, no JWT)
set local "request.jwt.claims" to '{}';
update public.profiles set name = 'Amy', status = 'active' where id = '00000000-0000-0000-0000-0000000000a2';
update public.profiles set name = 'Gil', status = 'active' where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set name = 'Sam', role = 'staff', status = 'active', org_id = null where id = '00000000-0000-0000-0000-0000000000c2';

insert into public.engagements (id, org_id, title) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'Acme engagement');

-- Amy (Acme client) posts and reads.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$select public.post_message('00000000-0000-0000-0000-0000000000e1', 'Hello from Acme')$$,
  'client posts to own engagement'
);
select is((select count(*)::int from public.engagement_messages('00000000-0000-0000-0000-0000000000e1')),
          1, 'client sees the message');
select is((select author_name from public.engagement_messages('00000000-0000-0000-0000-0000000000e1') limit 1),
          'Amy', 'author name is joined');

-- Gil (other org) is forbidden.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok(
  $$select public.post_message('00000000-0000-0000-0000-0000000000e1', 'sneaky')$$,
  'forbidden', 'other-org client cannot post'
);
select throws_ok(
  $$select * from public.engagement_messages('00000000-0000-0000-0000-0000000000e1')$$,
  'forbidden', 'other-org client cannot read'
);

-- Sam (staff, no org) can post.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select lives_ok(
  $$select public.post_message('00000000-0000-0000-0000-0000000000e1', 'Hi from CausQ')$$,
  'staff posts to any engagement'
);

select * from finish();
rollback;
```

- [ ] **Step 2:** `npx supabase test db`. Expected: all files pass (now 24 total).
- [ ] **Step 3:** Commit: `test(portal): messaging access-control pgTAP`.

---

## Task 4: MailerSend notify helper

**Files:** Create `portal/src/lib/notify.ts`

- [ ] **Step 1:** Write (env-guarded; no-op without a key):

```ts
import "server-only";

type Mail = { to: string; subject: string; text: string };

export async function sendEmail({ to, subject, text }: Mail) {
  const key = process.env.MAILERSEND_API_KEY;
  const from = process.env.PORTAL_FROM_EMAIL ?? "hello@causq.com";
  if (!key) {
    console.log(`[notify:skipped no MAILERSEND_API_KEY] -> ${to}: ${subject}`);
    return { skipped: true };
  }
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: from, name: "CausQ" },
      to: [{ email: to }],
      subject,
      text,
    }),
  });
  return { ok: res.ok, status: res.status };
}
```

- [ ] **Step 2:** Add `MAILERSEND_API_KEY=` and `PORTAL_FROM_EMAIL=hello@causq.com` to `.env.example`.
- [ ] **Step 3:** `npm run build`. Expected: compiles.
- [ ] **Step 4:** Commit: `feat(portal): MailerSend notify helper (env-guarded)`.

---

## Task 5: Messages thread + composer on engagement detail

**Files:** Create `portal/src/app/portal/engagements/[id]/messages-actions.ts`, `portal/src/app/portal/engagements/[id]/MessageComposer.tsx`; modify the detail `page.tsx`.

- [ ] **Step 1:** `messages-actions.ts`:

```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export async function sendMessage(engagementId: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.rpc("post_message", {
    p_engagement: engagementId,
    p_body: body,
  });
  if (error) return { error: error.message };

  // Best-effort notify the engagement lead (admin client to look up the lead).
  try {
    const admin = createAdminClient();
    const { data: eng } = await admin
      .from("engagements")
      .select("title, lead_id")
      .eq("id", engagementId)
      .single();
    if (eng?.lead_id) {
      const { data: lead } = await admin
        .from("profiles")
        .select("email")
        .eq("id", eng.lead_id)
        .single();
      if (lead?.email) {
        await sendEmail({
          to: lead.email,
          subject: `New message on ${eng.title}`,
          text: `A client posted a new message on the engagement "${eng.title}". Open the CausQ portal to reply.`,
        });
      }
    }
  } catch {
    // notification is best-effort; never block the message
  }

  revalidatePath(`/portal/engagements/${engagementId}`);
  return { ok: true };
}
```

- [ ] **Step 2:** `MessageComposer.tsx`:

```tsx
"use client";
import { useRef, useState } from "react";
import { sendMessage } from "./messages-actions";
import { Button } from "@/components/ui/button";

export function MessageComposer({ engagementId }: { engagementId: string }) {
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setError(null);
        const r = await sendMessage(engagementId, fd);
        if (r?.error) setError(r.error);
        else formRef.current?.reset();
      }}
      className="space-y-2"
    >
      <textarea
        name="body"
        required
        rows={2}
        placeholder="Write a message…"
        className="w-full rounded border p-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">Send</Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
```

- [ ] **Step 3:** In detail `page.tsx`, after the documents section, fetch messages via RPC and render a thread + composer:

```tsx
  const { data: messages } = await supabase.rpc("engagement_messages", { p_engagement: id });
```

```tsx
      <section className="space-y-3">
        <h2 className="font-medium">Messages</h2>
        <ul className="space-y-2">
          {(messages ?? []).map((m) => (
            <li key={m.id} className="rounded border p-3">
              <div className="text-xs text-neutral-500">
                {m.author_name ?? "Unknown"} {m.author_role === "client" ? "" : "· CausQ"}
              </div>
              <div className="text-sm">{m.body}</div>
            </li>
          ))}
          {(!messages || messages.length === 0) && (
            <li className="text-sm text-neutral-500">No messages yet.</li>
          )}
        </ul>
        <MessageComposer engagementId={id} />
      </section>
```

with `import { MessageComposer } from "./MessageComposer";` at top.

- [ ] **Step 4:** `npm run build`. Expected: compiles.
- [ ] **Step 5:** Commit: `feat(portal): engagement messaging thread, composer, and notify`.

---

## Task 6: Invoices list + download

**Files:** Create `portal/src/app/portal/invoices/page.tsx`, `portal/src/app/portal/invoices/InvoiceDownload.tsx`; modify `portal/src/app/portal/page.tsx`.

- [ ] **Step 1:** `InvoiceDownload.tsx` (client; signed URL from documents bucket):

```tsx
"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function InvoiceDownload({ path }: { path: string }) {
  async function download() {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) {
      alert("Unable to generate download link.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }
  return (
    <Button size="sm" variant="outline" onClick={download}>
      Download PDF
    </Button>
  );
}
```

- [ ] **Step 2:** `invoices/page.tsx` (server):

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { InvoiceDownload } from "./InvoiceDownload";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, number, amount, currency, status, due_date, pdf_path")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <a href="/portal" className="text-sm text-brand-deep underline">← Back</a>
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <ul className="space-y-2">
        {(invoices ?? []).map((inv) => (
          <li key={inv.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-medium">{inv.number}</div>
              <div className="text-sm text-neutral-500">
                {inv.currency} {Number(inv.amount).toLocaleString()} · due {inv.due_date ?? "—"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
              {inv.pdf_path && <InvoiceDownload path={inv.pdf_path} />}
            </div>
          </li>
        ))}
        {(!invoices || invoices.length === 0) && (
          <li className="text-sm text-neutral-500">No invoices yet.</li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3:** In dashboard `page.tsx`, add a link to invoices near the heading:

```tsx
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your engagements</h1>
        <a href="/portal/invoices" className="text-sm text-brand-deep underline">Invoices →</a>
      </div>
```

(replacing the existing `<h1>`.)

- [ ] **Step 4:** `npm run build`. Expected: compiles.
- [ ] **Step 5:** Commit: `feat(portal): invoices list with status badges and PDF download`.

---

## Task 7: Verification

- [ ] **Step 1:** `npx supabase test db` → 24/24.
- [ ] **Step 2:** Upload the seeded invoice PDF path via service role; confirm a signed URL resolves (same method as Plan 03 Task 7).
- [ ] **Step 3:** `npm run build` passes; push to update PR #1.

---

## Self-Review (completed during authoring)
- **Spec coverage:** threaded messaging client+staff (Tasks 1, 5); invoices view + download (Task 6); new-message notification (Tasks 4, 5). The `author_name` join avoids broad `profiles` exposure; staff posting works despite null `org_id`.
- **Placeholder scan:** all code present; em-dash characters in the invoices UI use the literal `—` only as a fallback string for a missing due date in JSX text (data, not prose) — acceptable, but switch to "n/a" if the house rule is read strictly.
- **Type/name consistency:** RPC names/params (`post_message(p_engagement,p_body)`, `engagement_messages(p_engagement)`) match between migration, test, and actions. `documents` bucket reused for invoice PDFs at `{org_id}/invoices/...`.

## Deferred
- Stripe pay-now (fast-follow); message read receipts; notification to client when staff replies (mirror of Task 5 using the org's members).
