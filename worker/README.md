# CausQ Forms Worker — setup

A Cloudflare Worker that backs the two site forms and connects them to **MailerLite**.
It runs on the route `causq.com/api/*`, so the site's existing `/api/contact` and
`/api/subscribe` calls work with **no frontend changes**.

```
Visitor submits form
   │
   ├─ /api/subscribe ─→ MailerLite "The Brief" group ─→ welcome automation (5 emails)
   │
   └─ /api/contact   ─→ MailerLite "Leads" group ─→ instant confirmation automation (to the lead)
                      └─→ MailerSend: "new lead" alert to your team   (OPTIONAL)
```

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

### 1. MailerLite: confirm sender + get an API token  (~5 min)
1. **Settings → Sending / Domains:** make sure a `@causq.com` sender is authenticated
   (MailerLite walks you through the DNS records; add them in Cloudflare, DNS-only/grey cloud).
   Automations won't send until a verified sender exists.
2. **Integrations → API → Generate token.** Copy it — this is `MAILERLITE_API_KEY`.

### 2. Review + activate the two automations  (~5 min)
Open the two dashboard links above. The copy is already written; tweak styling/branding
in the visual editor if you like, set the sender, then **toggle each automation ON**.
(They can't send to anyone until the Worker starts adding subscribers, so it's safe.)

### 3. Deploy the Worker  (~5 min)
From this `worker/` folder:
```bash
npm install -g wrangler
wrangler login                          # authorize your Cloudflare account
wrangler secret put MAILERLITE_API_KEY  # paste the MailerLite token
wrangler deploy                         # binds to causq.com/api/*
```

### 4. (Optional) Bot protection with Turnstile
The `/api/*` endpoint is public. To stop bots stuffing your list:
1. Cloudflare dashboard → **Turnstile → Add widget** (domain `causq.com`). Copy the **Site key** and **Secret key**.
2. Put the **Site key** in `assets/js/main.js` → `const TURNSTILE_SITEKEY = '...'` and deploy the site. A widget auto-appears on every form. (Do this first, so real users get a token.)
3. Set the **Secret key** on the Worker, then redeploy:
   ```bash
   wrangler secret put TURNSTILE_SECRET
   wrangler deploy
   ```
Until both are set, the Worker skips the check and forms work normally.

### 5. (Optional) Internal "new lead" alerts via MailerSend
Leads are already captured in MailerLite and auto-confirmed, so this is just for an instant
heads-up to your inbox (great for fast follow-up). If you skip it, nothing breaks — you'll
just see new leads in MailerLite's "Leads" group instead of getting pinged.

To enable: sign up at <https://www.mailersend.com>, verify `causq.com` (add the DNS records in
Cloudflare), create an API token, then:
```bash
wrangler secret put MAILERSEND_API_KEY
wrangler deploy
```
Set `NOTIFY_EMAIL` in `wrangler.toml` to where alerts should land (defaults to hello@causq.com).

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
