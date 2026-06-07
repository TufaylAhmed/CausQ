# CausQ Client Portal — v1 Design Spec

Date: 2026-06-07
Status: Approved (pending spec review)
Author: brainstorming session

## 1. Summary

A secure, external-login client portal for CausQ. Clients sign in to see their
engagements, documents and deliverables, messages with their engagement lead,
and invoices. This is Milestone 1 of a longer Professional Services Automation
(PSA) roadmap. It is a separate application from the existing static marketing
site, which stays unchanged.

House rules apply to all portal copy and UI: no em dashes, global framing (no
geographic targeting), and the CausQ brand system.

## 2. Goals and non-goals

### Goals (v1)
- Clients authenticate via Google SSO, Microsoft (Azure AD) SSO, or email, and
  can self-sign-up.
- New accounts get access to exactly one client organization, and never see
  another organization's data.
- Clients view: engagements and status, documents and deliverables, threaded
  messages per engagement, and invoices (view and download).
- CausQ staff have an admin area to approve users, manage organizations and
  engagements, upload documents, send invites, reply to messages, record
  invoices, and triage access requests.

### Non-goals (later milestones)
- CRM / sales pipeline
- Time tracking
- Resourcing and utilization
- Proposals / SOW authoring and e-signature
- BI / executive dashboards
- Client-side document upload (v1 is staff upload, client download)
- Stripe online payment (fast-follow after v1, see Section 7)

## 3. Decisions (locked in this session)

| Decision | Choice |
|----------|--------|
| Center of gravity | Client portal (external login) |
| v1 modules | Engagements & status, Documents & deliverables, Messaging, Invoices (view/download) |
| Invoices phasing | View/download in v1; Stripe "Pay now" as a fast-follow |
| Authentication | Google SSO, Microsoft (Azure AD) SSO, email (passwordless magic link); self-service signup |
| Access model | Domain match + staff approval, plus invite code/link, plus a request-access form |
| Backend | Supabase (Postgres + Auth + Storage), isolation via Row-Level Security |
| Frontend | Next.js (React) + TypeScript + Tailwind + shadcn/ui |
| Hosting | Cloudflare Pages on portal.causq.com (Vercel is the fallback if the CF Next adapter is fiddly) |
| Notifications | Supabase auth emails; app notifications via Edge Function reusing existing MailerSend sender |

## 4. Architecture

```
Next.js app (Cloudflare Pages)            Supabase
  /portal   client-facing        ──►        Auth: Google, Microsoft (Azure), email
  /admin    CausQ staff                      Postgres + RLS (per-org isolation)
  brand CSS + shadcn/ui                       Storage: per-org document buckets
                                              Edge Functions: invites, notifications
```

- Multi-tenant isolation is enforced at the database with RLS policies keyed on
  `org_id`, not in application code. Every client-readable table carries an
  `org_id` and policies check the signed-in user's organization membership.
- The browser talks to Supabase directly for auth, data, and files; RLS guards
  every read and write.
- The Next.js server handles SSR session management and a small number of
  privileged Edge Functions (sending invites, dispatching notification emails)
  using the Supabase service-role key, which is never exposed to the browser.
- The existing static marketing site (cPanel + Cloudflare) is untouched. The
  portal is a separate app on the `portal.causq.com` subdomain. The marketing
  site nav/footer gains a "Client login" link.

## 5. Data model (Postgres)

- **orgs** — client organizations. Fields: id, name, verified_domains (array),
  status, created_at.
- **profiles** — one row per auth user. Fields: id (= auth uid), name, email,
  org_id (nullable until approved), role (`client` | `staff` | `admin`),
  status (`pending` | `active` | `rejected`), created_at.
- **engagements** — org_id, title, summary, status, progress (0-100),
  lead_profile_id, start_date, end_date.
- **milestones** — engagement_id, title, status, due_date, sort. Drives the
  progress checklist.
- **documents** — org_id, engagement_id (nullable), filename, storage_path,
  size_bytes, uploaded_by, visibility, created_at.
- **messages** — engagement_id, author_profile_id, body, created_at. Threaded
  per engagement.
- **invoices** — org_id, number, amount, currency, status
  (`draft` | `sent` | `paid` | `overdue`), due_date, pdf_path, created_at.
- **invites** — token, org_id, email, expires_at, redeemed_by, created_at.
- **access_requests** — name, email, company, message, created_at. The
  "have us set you up" form. Creates no account and no access.

All client-readable tables (engagements, milestones, documents, messages,
invoices) carry or join to `org_id` for RLS.

## 6. Authentication and access flows

- **Sign in / sign up:** Google SSO, Microsoft (Azure AD) SSO, or email
  (Supabase passwordless magic link; no stored passwords). A new auth user gets
  a `profiles` row with `status = pending` and `org_id = null`.
- **Domain match + staff approval:** on signup, match the email domain against
  `orgs.verified_domains`. A match suggests that organization but leaves the
  user `pending`; the portal shows an "awaiting approval" empty state. An admin
  approves, which sets `status = active` and `org_id`. An unknown domain is held
  for admin review.
- **Invite code / link:** redeeming a valid, unexpired invite sets `org_id` and
  may auto-activate the account, skipping the domain step.
- **Request-access form:** a public page at `/portal/request-access` writes an
  `access_requests` row and emails CausQ. No login is granted. Staff follow up
  and create the account or send an invite.
- **Pending and empty states:** a `pending` user can authenticate, but RLS
  returns no engagement, document, message, or invoice rows, so there is zero
  data leakage before approval.

## 7. Feature modules

### 7.1 Engagements and status (client)
List of the organization's engagements with status, progress percentage, lead,
and a milestone checklist. A detail page per engagement ties together its
documents, messages, and invoices.

### 7.2 Documents and deliverables (client)
Per-organization file area, filterable by engagement. Secure download via
short-lived signed URLs from Supabase Storage. Upload is staff-only in v1;
optional client upload is a later increment.

### 7.3 Messaging / requests (client)
Threaded messages per engagement between the client and their lead. Email
notification on a new message via an Edge Function plus the existing MailerSend
sender.

### 7.4 Invoices and billing (client)
List of invoices with status badges and PDF download.
- v1: staff record invoices; clients view and download.
- Fast-follow: Stripe "Pay now" with payment status reflected back into the
  `invoices.status`.

### 7.5 Admin area (CausQ staff) — required for v1
Same app, gated by `role` (`staff` or `admin`). Capabilities: approve/reject
pending users; manage organizations and verified domains; create and manage
engagements and milestones; upload documents; send invites; reply to messages;
record invoices; triage `access_requests`. The portal cannot be populated
without this, so it ships in v1.

## 8. Notifications

- Supabase handles auth emails (magic link, OAuth confirmations).
- App notifications (new message, invite sent, approval granted, new document)
  go through a Supabase Edge Function that reuses the existing MailerSend sender
  so portal email matches the brand and the `hello@causq.com` reputation.

## 9. Look and feel

Brand-consistent with the marketing site: Albert Sans (display), Hanken Grotesk
(body), IBM Plex Mono (labels and kickers); teal `#06B6D4` accent with the
kicker-dot pattern; light `paper` surfaces with `night` accents. shadcn/ui is
themed to these tokens. No em dashes in any UI copy. Global framing, no
geographic language.

## 10. Repository and deployment

- New `portal/` application in this repo (Next.js + TypeScript). The marketing
  site is untouched.
- A Supabase project, with migrations and RLS policies checked into
  `portal/supabase/migrations` and version-controlled.
- Deploy the portal to Cloudflare Pages on `portal.causq.com`. Secrets (Supabase
  service-role key, MailerSend key, OAuth client secrets) live in Pages
  environment variables, never in the repo.
- Add a "Client login" link to the marketing site nav and footer.

## 11. Testing and security posture

This application holds client deliverables, so security is tested hardest.

- **RLS policy tests (priority):** automated tests proving an Acme user cannot
  read or write Globex rows or files, and that a `pending` user sees nothing.
- **Auth flow tests:** signup to pending to approval to access; invite
  redemption; signed-URL expiry.
- **Threat-model review before launch:** OAuth redirect and PKCE handling,
  service-role key containment, Storage bucket policies, and an audit log of
  admin actions.

## 12. Open items to confirm during planning

- Exact OAuth provider setup (Google Cloud project, Azure AD app registration)
  and redirect URLs for `portal.causq.com`.
- Whether the marketing site links the portal as a subdomain link only, or also
  surfaces a "Client login" affordance in the top nav.
- Invoice PDF generation: staff upload a PDF in v1, versus generating one from
  invoice fields (defer generation unless needed).
