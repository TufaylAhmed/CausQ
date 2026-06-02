# CausQ Forms Worker — setup

A Cloudflare Worker that backs the two site forms and connects them to **MailerLite**.
It runs on the route `causq.com/api/*`, so the site's existing `/api/contact` and
`/api/subscribe` calls work with **no frontend changes**.

```
Visitor submits form
   │
   ├─ /api/subscribe ─→ MailerLite "The Brief" group   (stores the contact)
   │                 └─→ MailerSend: welcome email with the featured article  → subscriber
   │
   └─ /api/contact   ─→ MailerLite "Leads" group       (stores the lead + fields)
                     ├─→ MailerSend: instant confirmation → the prospect
                     └─→ MailerSend: "new lead" alert     → your team
```

**Why the Worker sends the emails (not MailerLite automations):** MailerLite's API
can store contacts and scaffold automations, but it cannot set an automation email's
HTML body — that's UI-only, and picking a template there wiped the copy. So the Worker
sends the welcome + confirmation itself via MailerSend, where we control the HTML
exactly. MailerLite is the contact store (and can run a longer drip later, by hand).

> If you previously turned the two MailerLite automations ON, **turn them OFF** now
> (otherwise subscribers get a second, blank email). Dashboard → Automations → toggle off.

The Rust backend in `../backend/` is now **optional / local-dev only**. The Worker is
the production path — nothing to host, no server to keep running.

---

## Already done for you (via the MailerLite connector)

In account `tufayl@causq.com` (ID 2397439):

- **Groups created:**
  - `The Brief` — id `189100009366488366`
  - `Leads — Briefing Requests` — id `189100011485660699`
- **Custom fields created:** `region`, `interest`, `message` (`company` and `name` already existed)
- **Automations created (in DRAFT — review and turn on):**
  - `The Brief — Welcome & Nurture` (5 emails / Day 0,2,5,9,16) → triggered by joining "The Brief"
    <https://dashboard.mailerlite.com/automations/189100109354501450>
  - `Briefing Request — Instant Confirmation` (1 email to the lead) → triggered by joining "Leads"
    <https://dashboard.mailerlite.com/automations/189100190564615612>
- The group IDs are already filled into `wrangler.toml`.

---

## What you still need to do

Status so far: MailerLite groups/fields exist, `MAILERLITE_API_KEY` is set, and the
Worker is deployed and verified (contacts land in MailerLite). The remaining work is
turning on email **sending** via MailerSend.

### 1. Set up MailerSend — REQUIRED (it sends the welcome + confirmation)  (~10 min)
1. Go to <https://www.mailersend.com> and **sign in with your MailerLite account** (same login).
2. **Domains → Add domain → `causq.com`.** It shows SPF/DKIM/Return-Path DNS records.
3. Add each record in **Cloudflare → causq.com → DNS** (DNS-only / grey cloud). This does
   not affect your Cloudflare email forwarding.
4. Wait for the domain to show **Verified**.
5. **API tokens → Create token**, copy it, then from this `worker/` folder:
   ```bash
   wrangler secret put MAILERSEND_API_KEY   # paste the token at the prompt
   wrangler deploy
   ```
6. `FROM_EMAIL` / `NOTIFY_EMAIL` default to `hello@causq.com` in `wrangler.toml` — change if
   you want a different sender or alert inbox (must be on the verified domain).

Until `MAILERSEND_API_KEY` is set, contacts are still captured but no email goes out.

### 2. Turn OFF the two MailerLite automations
The Worker now sends the welcome + confirmation. If the MailerLite automations are ON they'd
send a second (blank) email, so disable them:
- Dashboard → Automations → toggle **off** "The Brief — Welcome & Nurture" and
  "Briefing Request — Instant Confirmation".

(They can stay as drafts for a future hand-built drip; just not active.)

### 3. (Optional) Bot protection with Turnstile
The `/api/*` endpoint is public. To stop bots stuffing your list:
1. Cloudflare dashboard → **Turnstile → Add widget** (domain `causq.com`). Copy the **Site key** and **Secret key**.
2. Put the **Site key** in `assets/js/main.js` → `const TURNSTILE_SITEKEY = '...'` and deploy the site. A widget auto-appears on every form. (Do this first, so real users get a token.)
3. Set the **Secret key** on the Worker, then redeploy:
   ```bash
   wrangler secret put TURNSTILE_SECRET
   wrangler deploy
   ```
Until both are set, the Worker skips the check and forms work normally.

---

## Smoke test (after deploy)
```bash
# subscribe
curl -s https://causq.com/api/subscribe -H 'Content-Type: application/json' \
  -d '{"email":"you+test@gmail.com"}'        # → {"ok":true,"message":"subscribed"}
# then submit the real contact form and confirm: lead appears in MailerLite "Leads",
# and the test address receives the confirmation email.
```

## Local development
```bash
wrangler dev    # http://localhost:8787 ; without secrets, MailerLite calls 401 and
                # MailerSend is skipped, but routing + validation still work.
```

## Environment reference
| Key | Where | Purpose |
|-----|-------|---------|
| `MAILERLITE_API_KEY` | secret | MailerLite API token (required) |
| `MAILERSEND_API_KEY` | secret | MailerSend token — team alerts only; skipped if unset |
| `ML_GROUP_BRIEF` / `ML_GROUP_LEADS` | var | Group IDs (already set) |
| `FROM_EMAIL` / `FROM_NAME` | var | Verified sender for the team alert |
| `NOTIFY_EMAIL` | var | Where team alerts are sent |
