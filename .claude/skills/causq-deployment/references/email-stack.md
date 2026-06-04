# CausQ Email & Forms Stack — reference

Deeper detail behind the runbook. Read this when a task goes beyond the common
operations — debugging the email pipeline, reworking the drip, or auditing the
MailerLite/MailerSend setup.

## Why this design (the decision trail)

The forms originally targeted a Rust/Axum backend, but the site is hosted on static
cPanel where there's no place to run a persistent server. The production answer became
a **Cloudflare Worker on `causq.com/api/*`**, so the existing same-origin
`/api/contact` and `/api/subscribe` calls work with **zero frontend changes** and no
CORS. The Rust app stays only for local development.

Email went through two dead ends before landing on MailerSend:
1. **SMTP from the backend** — no working SMTP available on the host.
2. **MailerLite automations** — MailerLite stores contacts and can scaffold an
   automation via API, but the automation email's **HTML body is UI-only**; the API
   reports success on updates yet GETs return 404, and selecting a template in the UI
   wiped the copy. Unreliable for programmatic control.

Final design: **MailerLite = contact store, MailerSend = sender.** The Worker writes
the contact to MailerLite and then sends the email itself via MailerSend, where the
HTML is fully controlled in code. MailerSend shares the MailerLite login but is a
separate product with its own API token.

## Request flow in `worker/src/worker.js`

- `fetch()` — routes POSTs, runs the Turnstile check first (`verifyTurnstile`, skipped
  if `TURNSTILE_SECRET` unset), then dispatches to `handleContact` / `handleSubscribe`.
  Tolerates trailing slashes; returns JSON with permissive CORS headers.
- `handleSubscribe(body)` — needs `email`. Runs `mlUpsert` (Brief group) + `msSend`
  (welcome) in parallel via `Promise.allSettled`. Succeeds if **either** the capture
  or a real send succeeded (a *skipped* send doesn't count).
- `handleContact(body)` — needs `name` + valid `email`; optional `company`, `region`,
  `interest`, `message`. Runs three calls in parallel: `mlUpsert` (Leads group) +
  confirmation email to the prospect + plain-text team alert to `NOTIFY_EMAIL` (with
  `reply_to` set to the prospect for one-click follow-up). "Lead is safe" if captured
  in MailerLite OR any real email send succeeded.
- `mlUpsert(env, email, fields, groupId)` — POST `connect.mailerlite.com/api/subscribers`.
  Assigning the group is what would trigger a group automation (which we keep off).
- `msSend(env, {to, subject, text, html, reply_to})` — POST `api.mailersend.com/v1/email`.
  Returns `{skipped:true}` if `MAILERSEND_API_KEY` unset; success is HTTP **202**.
- `welcomeEmail(name)` / `leadConfirmEmail(name)` — return `{subject, html, text}`.
  `shell(inner)` is the shared HTML wrapper; `esc()` escapes user input;
  `firstName()` extracts the greeting name. **Edit copy here, then `wrangler deploy`.**

## Full account / resource inventory

| Resource | Identifier |
|---|---|
| MailerLite account | `tufayl@causq.com`, ID `2397439` |
| MailerLite group — The Brief | `189100009366488366` |
| MailerLite group — Leads — Briefing Requests | `189100011485660699` |
| MailerLite custom fields | `region`, `interest`, `message` (+ pre-existing `name`, `company`) |
| ML automation — The Brief — Welcome & Nurture (DRAFT/OFF) | `189100109354501450` |
| ML automation — Briefing Request — Instant Confirmation (DRAFT/OFF) | `189100190564615612` |
| MailerSend | sign in with the MailerLite login; sender domain `causq.com` (verify SPF/DKIM/Return-Path) |
| Cloudflare zone | `causq.com` (DNS, CDN proxy, Turnstile, inbound email forwarding) |
| cPanel / host | Namecheap, user `faazcvhi`, deploy path `/home/faazcvhi/causq.com/` |
| GitHub | `https://github.com/TufaylAhmed/CausQ.git` (branch `main`) |

### Environment matrix

| Key | Kind | Default / value | Purpose |
|---|---|---|---|
| `MAILERLITE_API_KEY` | secret | — | MailerLite API token (**required**) |
| `MAILERSEND_API_KEY` | secret | — | MailerSend token; sends skipped if unset |
| `TURNSTILE_SECRET` | secret | — | Turnstile server secret; check skipped if unset |
| `ML_GROUP_BRIEF` | var | `189100009366488366` | The Brief group id |
| `ML_GROUP_LEADS` | var | `189100011485660699` | Leads group id |
| `FROM_EMAIL` | var | `hello@causq.com` | Verified MailerSend sender |
| `FROM_NAME` | var | `CausQ` | Sender display name |
| `NOTIFY_EMAIL` | var | `hello@causq.com` | Where new-lead alerts go |

## The Brief drip (emails 2–5)

Only **email 1 (welcome)** is sent automatically today, by the Worker on subscribe.
The full 5-email nurture sequence (Day 0/2/5/9/16) is written up in
`marketing/the-brief-welcome-sequence.md`. To actually send 2–5 you have two paths:
- **Hand-build a MailerLite drip** in the dashboard UI (the API can't set the bodies),
  triggered by joining "The Brief". Keep email 1 in the Worker or move it here — don't
  let both send email 1.
- **Extend the Worker** to schedule follow-ups (e.g. Cron Triggers + a KV/queue of due
  sends). More control, more code.

## Local development

- Worker: `cd worker && wrangler dev` → `http://localhost:8787`. Without secrets,
  MailerLite calls 401 and MailerSend is skipped, but routing + validation still work.
- Static site quick look: open `index.html` directly — forms show a local confirmation,
  image/logo slots show labelled placeholders.
- Full local stack (optional): `cd backend && cargo run` → `http://localhost:8080`
  serves the site + a SQLite-backed API. Local-dev only; not the production path.
