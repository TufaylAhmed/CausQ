---
name: causq-deployment
description: >-
  Operations runbook for the CausQ marketing site (causq.com) and its form/email
  stack. Use this whenever working on the CausQ website: deploying or updating the
  static site to cPanel/Namecheap, editing or deploying the Cloudflare Worker
  (causq-forms) that powers the contact/subscribe forms, managing MailerLite
  contacts/groups/automations or MailerSend transactional email, rotating API
  keys/secrets, enabling Cloudflare Turnstile, adding or editing pages, or
  troubleshooting why forms or emails aren't working. Trigger it even when the user
  just says "deploy the site", "push the site live", "the contact form is broken",
  "update the welcome email", "no emails are going out", or names causq.com, the
  worker, wrangler, MailerLite, MailerSend, or Turnstile — they almost always mean
  this stack. When in doubt on anything CausQ-deployment-related, consult this skill
  first rather than guessing the IDs, paths, or which pipeline to use.
---

# CausQ Deployment & Operations Runbook

This is the operations guide for **causq.com** — a dependency-free static marketing
site whose two forms are backed by a Cloudflare Worker, MailerLite (contact store),
and MailerSend (transactional email). It hard-codes the real accounts, IDs, and
paths so you don't have to rediscover them.

**Read this before acting.** The single most common mistake is treating the site and
the Worker as one deploy. They are **two independent pipelines** — see Architecture.

## Architecture

```
                         ┌─────────────────── STATIC SITE ───────────────────┐
  git push origin main → GitHub (TufaylAhmed/CausQ) → cPanel pulls (.cpanel.yml)
                         → copies files to /home/faazcvhi/causq.com/  (Namecheap)
                         └────────────────────────────────────────────────────┘

                         ┌──────────────────── FORMS WORKER ─────────────────┐
  cd worker && wrangler deploy → Cloudflare Worker "causq-forms"
                         → served on route  causq.com/api/*  (same origin)
                         └────────────────────────────────────────────────────┘

  Visitor submits a form (frontend POSTs same-origin, no CORS):
    /api/subscribe ─→ MailerLite "The Brief" group        (stores contact)
                   └─→ MailerSend: welcome email          → subscriber
    /api/contact   ─→ MailerLite "Leads" group            (stores lead + fields)
                   ├─→ MailerSend: instant confirmation   → the prospect
                   └─→ MailerSend: "new lead" alert        → your team (NOTIFY_EMAIL)

  Cloudflare proxies causq.com (DNS + CDN + Turnstile). Cloudflare also handles
  inbound email forwarding for the domain — leave that alone when editing DNS.
```

The Rust/Axum app in `backend/` is **local-dev only** now. It is *not* the production
backend — the Worker is. Don't deploy or reference it for production tasks.

## Critical facts (the inventory)

| Thing | Value |
|---|---|
| Domain | `causq.com` (active Cloudflare zone, proxied) |
| Static host | cPanel on **Namecheap**, user `faazcvhi` |
| Deploy path | `/home/faazcvhi/causq.com/` |
| Deploy mechanism | `.cpanel.yml` git deployment — cPanel pulls from GitHub on push |
| Git remote | `https://github.com/TufaylAhmed/CausQ.git`, branch `main` |
| Worker name | `causq-forms` (entry `worker/src/worker.js`) |
| Worker route | `causq.com/api/*`, zone `causq.com` |
| Worker deploy | `cd worker && wrangler deploy` (direct to Cloudflare; **does not** go through GitHub/cPanel) |
| Email copy | lives in code: `worker/src/worker.js` → `welcomeEmail()`, `leadConfirmEmail()` |
| Brief drip (emails 2–5) | documented only in `marketing/the-brief-welcome-sequence.md`; not auto-sent yet |
| Turnstile site key | `assets/js/main.js` → `const TURNSTILE_SITEKEY = ''` (empty = off) |

### MailerLite (the contact store)
- Account `tufayl@causq.com`, ID `2397439`
- Group **The Brief** — `189100009366488366`  (env `ML_GROUP_BRIEF`)
- Group **Leads — Briefing Requests** — `189100011485660699`  (env `ML_GROUP_LEADS`)
- Custom fields: `region`, `interest`, `message` (`name`, `company` already existed)
- Automations exist but are **DRAFT and must stay OFF** (the Worker sends the emails instead — see Gotchas):
  - The Brief — Welcome & Nurture: `189100109354501450`
  - Briefing Request — Instant Confirmation: `189100190564615612`

### MailerSend (sends the email)
- Sign in **with the MailerLite login** (same account) at <https://mailersend.com> — separate API token, separate service.
- Sender domain `causq.com` must show **Verified** (SPF/DKIM/Return-Path DNS records added in Cloudflare DNS, **DNS-only / grey cloud**).
- Success = HTTP `202`. If `MAILERSEND_API_KEY` is unset, sends are **skipped** (logged), contacts still captured.

### Worker config — `worker/wrangler.toml`
- **Vars (non-secret, in the file):** `ML_GROUP_BRIEF`, `ML_GROUP_LEADS`, `FROM_EMAIL=hello@causq.com`, `FROM_NAME=CausQ`, `NOTIFY_EMAIL=hello@causq.com`
- **Secrets (set via `wrangler secret put`, never in the file):**
  - `MAILERLITE_API_KEY` — **required** (was rotated once after an early misconfig; if MailerLite calls 401, suspect the token)
  - `MAILERSEND_API_KEY` — optional; without it, email is skipped
  - `TURNSTILE_SECRET` — optional; without it, the bot check is skipped

## Operations

Pick the pipeline that matches the change. Front-end/page/CSS edits → **static site**.
Form logic, email copy, env, or secrets → **Worker**. Many tasks touch only one.

### Deploy the static site
The frontend ships through git. Commit and push to `main`; cPanel pulls and runs the
`.cpanel.yml` copy tasks automatically.
```bash
git add -A && git commit -m "…"
git push origin main          # cPanel deploys from here
```
If cPanel auto-deploy isn't firing, trigger it from cPanel → **Git Version Control →
Manage → Pull or Deploy**. Verify with a hard refresh of the changed page on causq.com.

### Add or rename a page — DON'T FORGET `.cpanel.yml`
`.cpanel.yml` copies an **explicit list** of HTML files. A new page that isn't listed
will live in git but **never deploy**. After creating `new-page.html`:
1. Add `- /bin/cp -f new-page.html $DEPLOYPATH` to `.cpanel.yml`.
2. Add it to `sitemap.xml` and to nav/footer links if appropriate.
3. Commit + push. (CSS/JS/images under `assets/` deploy automatically — that dir is copied recursively.)

### Deploy or update the Worker
Independent of the site deploy. From the repo:
```bash
cd worker
wrangler deploy               # pushes worker.js + wrangler.toml vars to Cloudflare
```
Changing a `[vars]` value in `wrangler.toml` only takes effect on the next `wrangler deploy`.

### Set or rotate a secret
Secrets are not in any file. From `worker/`:
```bash
wrangler secret put MAILERLITE_API_KEY    # paste at the prompt, then:
wrangler deploy
```
Same pattern for `MAILERSEND_API_KEY` and `TURNSTILE_SECRET`. Rotating a key = put the
new value, redeploy. List current secret names with `wrangler secret list`.

### Update transactional email copy
The welcome and lead-confirmation emails are **code, not MailerLite templates**. Edit
`worker/src/worker.js` → `welcomeEmail(name)` / `leadConfirmEmail(name)` (both return
`{subject, html, text}`; keep the HTML and plain-text versions in sync), then
`wrangler deploy`. The shared HTML wrapper is `shell()`. The featured-article link in
the welcome email is hard-coded there too.

### Enable Cloudflare Turnstile (bot protection)
Both halves must be set or the check is skipped. Do the site key **first** so real
visitors get a token before the Worker starts requiring one:
1. Cloudflare → **Turnstile → Add widget** (domain `causq.com`). Copy **Site key** + **Secret key**.
2. Put the **Site key** in `assets/js/main.js` (`TURNSTILE_SITEKEY`), then deploy the site (git push). A widget auto-injects on every form.
3. `cd worker && wrangler secret put TURNSTILE_SECRET` (the Secret key), then `wrangler deploy`.

### Smoke test (after any Worker/email change)
```bash
# subscribe path → expect {"ok":true,"message":"subscribed"}
curl -s https://causq.com/api/subscribe -H 'Content-Type: application/json' \
  -d '{"email":"you+test@gmail.com"}'
```
Then submit the real contact form on the site and confirm: the lead appears in
MailerLite "Leads", the test address gets the confirmation email, and `NOTIFY_EMAIL`
gets the team alert. `cd worker && wrangler tail` streams live logs while you test.

## Gotchas (read before debugging)

- **The Worker sends the emails, not MailerLite automations.** MailerLite's API can
  store contacts and scaffold an automation, but it **cannot set an automation email's
  HTML body** (UI-only, and choosing a template wipes the copy). So we send welcome +
  confirmation from the Worker via MailerSend, where we control the HTML exactly.
  MailerLite is just the contact store (+ a possible future hand-built drip).
- **Keep the two MailerLite automations OFF.** If they're toggled on, subscribers get a
  second, blank email on top of the Worker's. They're kept as drafts only.
- **MailerLite update-email API reports success but GETs 404.** Known quirk — don't
  chase it; it's why we stopped driving email through MailerLite at all.
- **MailerSend ≠ MailerLite.** Same login, two services, two separate API tokens. Don't
  reuse one token for the other.
- **Site and Worker deploy separately.** Pushing to GitHub does **not** redeploy the
  Worker, and `wrangler deploy` does **not** update the static pages. A "the site looks
  updated but the form still behaves old" symptom usually means only one ran.

## Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| Form returns 403 "failed bot check" | `TURNSTILE_SECRET` is set but the page has no/empty `TURNSTILE_SITEKEY`, so no token is sent. Set the site key + deploy the site, or unset the secret. |
| Contacts captured but no emails | `MAILERSEND_API_KEY` not set (sends skipped — `wrangler tail` shows "MailerSend not configured"), or sender domain not Verified in MailerSend. |
| MailerLite calls 401 | `MAILERLITE_API_KEY` missing/invalid — re-put the secret and `wrangler deploy`. |
| Subscriber gets two emails (one blank) | A MailerLite automation is ON — toggle it OFF in the dashboard. |
| New page 404s on causq.com after push | Not added to `.cpanel.yml` — add the `cp` line, commit, push. |
| Form does nothing / CORS error | Worker not deployed to the `causq.com/api/*` route, or zone inactive — `wrangler deploy` and check the route in `wrangler.toml`. |
| Emails land in spam | SPF/DKIM/Return-Path not fully verified in MailerSend, or DNS records proxied (orange) instead of DNS-only (grey). |

For the deeper "why" behind the email architecture and the full account inventory, see
[`references/email-stack.md`](references/email-stack.md).
