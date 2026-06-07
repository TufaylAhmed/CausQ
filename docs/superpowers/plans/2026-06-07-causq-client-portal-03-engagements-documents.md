# CausQ Client Portal — Plan 03: Engagements & Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Authenticated clients can open an engagement, see its milestones, and download its documents; CausQ staff can upload documents. Per-org isolation extends to file storage.

**Architecture:** A private Supabase Storage bucket `documents` holds files under `{org_id}/...`. RLS on `storage.objects` mirrors the table policies (active org member reads own org; staff read/write all). The engagement detail page reads milestones + documents (RLS-scoped) and downloads via short-lived signed URLs. Staff upload through a role-gated server action.

**Tech Stack:** Next.js 16 App Router, Supabase Storage + pgTAP, Tailwind v4 + shadcn/ui.

**Builds on:** Plans 01-02 (`feat/client-portal`).

---

## File Structure

```
portal/supabase/migrations/
  20260607140000_documents_storage.sql   bucket + storage.objects RLS
  20260607140100_seed_demo_content.sql   milestones + a document row for the demo engagement
portal/supabase/tests/
  storage_isolation.test.sql             pgTAP: cross-org storage read isolation
portal/src/app/portal/
  page.tsx                               (modify) link each engagement to its detail page
  engagements/[id]/page.tsx              engagement detail: milestones + documents + download
  engagements/[id]/DocumentRow.tsx       client component: signed-URL download button
  engagements/[id]/upload-actions.ts     staff-only upload server action
  engagements/[id]/UploadForm.tsx        role-gated upload UI
```

---

## Task 1: Storage bucket + RLS (migration)

**Files:** Create `portal/supabase/migrations/20260607140000_documents_storage.sql`

- [ ] **Step 1:** Write:

```sql
-- Private bucket for client deliverables.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Read: staff (all) or active member of the org that owns the top-level folder.
create policy documents_read on storage.objects
  for select using (
    bucket_id = 'documents' and (
      public.auth_is_staff() or (
        public.auth_is_active()
        and (storage.foldername(name))[1] = public.auth_org_id()::text
      )
    )
  );

-- Write (upload/update/delete): staff only.
create policy documents_staff_write on storage.objects
  for all using (
    bucket_id = 'documents' and public.auth_is_staff()
  ) with check (
    bucket_id = 'documents' and public.auth_is_staff()
  );
```

- [ ] **Step 2:** `npx supabase db reset`. Expected: clean.
- [ ] **Step 3:** Commit: `feat(portal): private documents bucket with per-org storage RLS`.

---

## Task 2: Seed demo content (migration is wrong place; use seed.sql)

**Files:** Modify `portal/supabase/seed.sql`

- [ ] **Step 1:** Append milestones + a document row for the demo engagement (`2222...`, org `1111...`):

```sql
insert into public.milestones (id, engagement_id, title, status, sort) values
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 'Discovery & inventory', 'done', 10),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'Crypto-agility gap analysis', 'in_progress', 20),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Roadmap & handover', 'todo', 30)
on conflict (id) do nothing;

insert into public.documents (id, org_id, engagement_id, filename, storage_path, size_bytes) values
  ('44444444-4444-4444-4444-444444444444',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'Quantum-readiness-summary.txt',
   '11111111-1111-1111-1111-111111111111/Quantum-readiness-summary.txt',
   42)
on conflict (id) do nothing;
```

- [ ] **Step 2:** `npx supabase db reset`. Expected: clean.
- [ ] **Step 3:** Commit: `chore(portal): seed milestones and a demo document row`.

---

## Task 3: Storage isolation pgTAP test

**Files:** Create `portal/supabase/tests/storage_isolation.test.sql`

- [ ] **Step 1:** Write (4 assertions):

```sql
begin;
select plan(4);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}'),
  ('00000000-0000-0000-0000-0000000000b1', 'Globex', '{globex.com}');

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'gil@globex.com');

update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', status = 'active'
  where id = '00000000-0000-0000-0000-0000000000a2';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000b1', status = 'active'
  where id = '00000000-0000-0000-0000-0000000000b2';

insert into storage.buckets (id, name, public) values ('documents','documents',false)
  on conflict (id) do nothing;

insert into storage.objects (bucket_id, name) values
  ('documents', '00000000-0000-0000-0000-0000000000a1/acme.pdf'),
  ('documents', '00000000-0000-0000-0000-0000000000b1/globex.pdf');

-- Acme sees only its own object.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from storage.objects where bucket_id='documents'), 1, 'Acme sees one object');
select results_eq(
  $$select name from storage.objects where bucket_id='documents'$$,
  $$values ('00000000-0000-0000-0000-0000000000a1/acme.pdf')$$,
  'Acme sees only its own file'
);

-- Globex sees only its own object.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is((select count(*)::int from storage.objects where bucket_id='documents'), 1, 'Globex sees one object');
select results_eq(
  $$select name from storage.objects where bucket_id='documents'$$,
  $$values ('00000000-0000-0000-0000-0000000000b1/globex.pdf')$$,
  'Globex sees only its own file'
);

select * from finish();
rollback;
```

- [ ] **Step 2:** `npx supabase test db`. Expected: all files pass (6 + 8 + 4 = 18).
- [ ] **Step 3:** Commit: `test(portal): storage per-org isolation pgTAP`.

---

## Task 4: Engagement detail page + download

**Files:** Create `portal/src/app/portal/engagements/[id]/page.tsx`, `portal/src/app/portal/engagements/[id]/DocumentRow.tsx`

- [ ] **Step 1:** `DocumentRow.tsx` (client) — signed-URL download:

```tsx
"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DocumentRow({ path, filename }: { path: string; filename: string }) {
  async function download() {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60);
    if (error || !data) return alert("Unable to generate download link.");
    window.open(data.signedUrl, "_blank");
  }
  return (
    <div className="flex items-center justify-between rounded border p-3">
      <span className="text-sm">{filename}</span>
      <Button size="sm" variant="outline" onClick={download}>Download</Button>
    </div>
  );
}
```

- [ ] **Step 2:** `page.tsx` (server) — engagement + milestones + documents (RLS-scoped). `params` is async in Next 16:

```tsx
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { DocumentRow } from "./DocumentRow";

export default async function EngagementDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: engagement } = await supabase
    .from("engagements")
    .select("id, title, summary, status, progress")
    .eq("id", id)
    .maybeSingle();
  if (!engagement) notFound();

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, title, status")
    .eq("engagement_id", id)
    .order("sort");

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, storage_path")
    .eq("engagement_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <a href="/portal" className="text-sm text-brand-deep underline">← All engagements</a>
      <div>
        <h1 className="text-2xl font-semibold">{engagement.title}</h1>
        <p className="text-sm text-neutral-500">{engagement.status} · {engagement.progress}%</p>
        {engagement.summary && <p className="mt-2 text-neutral-700">{engagement.summary}</p>}
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Milestones</h2>
        <ul className="space-y-1">
          {(milestones ?? []).map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              <span className={m.status === "done" ? "text-brand-deep" : "text-neutral-400"}>
                {m.status === "done" ? "✓" : "○"}
              </span>
              <span>{m.title}</span>
              <span className="text-neutral-400">· {m.status}</span>
            </li>
          ))}
          {(!milestones || milestones.length === 0) && (
            <li className="text-sm text-neutral-500">No milestones yet.</li>
          )}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Documents</h2>
        <div className="space-y-2">
          {(documents ?? []).map((d) => (
            <DocumentRow key={d.id} path={d.storage_path} filename={d.filename} />
          ))}
          {(!documents || documents.length === 0) && (
            <p className="text-sm text-neutral-500">No documents yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3:** `npm run build`. Expected: compiles.
- [ ] **Step 4:** Commit: `feat(portal): engagement detail with milestones and document downloads`.

---

## Task 5: Link dashboard rows to detail pages

**Files:** Modify `portal/src/app/portal/page.tsx`

- [ ] **Step 1:** Wrap each engagement `<li>` content in a link to `/portal/engagements/${e.id}` (replace the inner markup with an `<a>` keeping the same styles).
- [ ] **Step 2:** `npm run build`. Expected: compiles.
- [ ] **Step 3:** Commit: `feat(portal): link dashboard engagements to detail pages`.

---

## Task 6: Staff upload

**Files:** Create `portal/src/app/portal/engagements/[id]/upload-actions.ts`, `portal/src/app/portal/engagements/[id]/UploadForm.tsx`; modify the detail `page.tsx` to render `UploadForm` for staff.

- [ ] **Step 1:** `upload-actions.ts` (server, staff-checked):

```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadDocument(engagementId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();
  if (!profile || profile.status !== "active" || !["staff", "admin"].includes(profile.role)) {
    return { error: "Staff only." };
  }

  const { data: engagement } = await supabase
    .from("engagements")
    .select("org_id")
    .eq("id", engagementId)
    .single();
  if (!engagement) return { error: "Engagement not found." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a file." };

  const path = `${engagement.org_id}/${Date.now()}-${file.name}`;
  const up = await supabase.storage.from("documents").upload(path, file);
  if (up.error) return { error: up.error.message };

  const ins = await supabase.from("documents").insert({
    org_id: engagement.org_id,
    engagement_id: engagementId,
    filename: file.name,
    storage_path: path,
    size_bytes: file.size,
    uploaded_by: user.id,
  });
  if (ins.error) return { error: ins.error.message };

  revalidatePath(`/portal/engagements/${engagementId}`);
  return { ok: true };
}
```

- [ ] **Step 2:** `UploadForm.tsx` (client):

```tsx
"use client";
import { useState } from "react";
import { uploadDocument } from "./upload-actions";
import { Button } from "@/components/ui/button";

export function UploadForm({ engagementId }: { engagementId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      action={async (fd) => {
        setBusy(true);
        const r = await uploadDocument(engagementId, fd);
        setBusy(false);
        if (r?.error) setError(r.error);
      }}
      className="flex items-center gap-2 rounded border border-dashed p-3"
    >
      <input type="file" name="file" required className="text-sm" />
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Uploading…" : "Upload"}
      </Button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}
```

- [ ] **Step 3:** In the detail `page.tsx`, fetch the caller's role and render `<UploadForm engagementId={id} />` above the documents list when role is staff/admin. Add after the existing profile/user fetch:

```tsx
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = me?.role === "staff" || me?.role === "admin";
```

and inside the Documents section, before the list:

```tsx
  {isStaff && <UploadForm engagementId={id} />}
```

with `import { UploadForm } from "./UploadForm";` at top.

- [ ] **Step 4:** `npm run build`. Expected: compiles.
- [ ] **Step 5:** Commit: `feat(portal): staff document upload to per-org storage`.

---

## Task 7: Verification

- [ ] **Step 1:** `npx supabase test db` → 18/18.
- [ ] **Step 2:** Upload the demo file to storage so the seeded row downloads, then confirm a signed URL works:

```bash
# put a small object at the seeded path via the storage API (service role)
# then fetch a signed URL as an active user and confirm 200.
```

(Implementation note: seed row points to `1111…/Quantum-readiness-summary.txt`; upload that object with the service role in a one-off script during verification.)

- [ ] **Step 3:** `npm run build` passes; push branch to update PR #1.

---

## Self-Review (completed during authoring)
- **Spec coverage:** engagement detail + milestones (Task 4); per-org document storage with RLS (Tasks 1, 3); signed-URL download (Task 4); staff upload (Task 6); navigation (Task 5). Client upload remains out of scope (later).
- **Placeholder scan:** all component/SQL code present; Task 7 Step 2 is a manual verification, not plan code.
- **Type/name consistency:** `documents.storage_path` and path convention `{org_id}/{file}` match between bucket policy, seed, detail page, and upload action. RPC/helper names unchanged from Plans 01-02.

## Deferred
- Client-side document upload; document delete/versioning; notification on new document (Plan 04).
