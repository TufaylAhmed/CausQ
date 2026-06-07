# CausQ Client Portal — Plan 06: Deploy to Namecheap cPanel (Node.js / Passenger)

Hosting target: **Namecheap cPanel with "Setup Node.js App"** (Phusion Passenger).
The portal is a dynamic Next.js 16 app, packaged as a **standalone** server bundle
(`output: "standalone"`), uploaded as `portal-deploy.zip` (~12 MB, self-contained,
no `npm install` needed on the server).

DB is already live on Supabase cloud (`krpmwhwayccphqnzlpff`, region ap-northeast-1):
10 tables + 20 RLS policies applied.

---

## Values to use

| Key | Value |
|-----|-------|
| Project URL | `https://krpmwhwayccphqnzlpff.supabase.co` |
| Publishable (anon) | `sb_publishable_mftenH6RaxAYc0h67oBSyA_TY1RKcag` |
| Service role (secret) | (set in cPanel env; not committed) |
| Portal domain | `portal.causq.com` |

---

## Step A — Subdomain + DNS

1. cPanel → **Domains** (or "Subdomains") → create **`portal.causq.com`**. Note the
   **Document Root** it assigns (we will not serve files from there directly, but the
   subdomain must exist for the Node app URL).
2. Cloudflare DNS (causq.com zone) → add a record for `portal`:
   - **A** record → the Namecheap hosting **server IP** (cPanel → right sidebar "Shared IP Address"), or
   - **CNAME** → your cPanel hostname.
   - Start **DNS-only (grey cloud)** to let cPanel AutoSSL issue a cert; you can enable the
     orange proxy afterward.
3. cPanel → **SSL/TLS Status** → run **AutoSSL** for `portal.causq.com` (or use Cloudflare SSL).

## Step B — Create the Node.js app

cPanel → **Setup Node.js App** → **Create Application**:
- **Node.js version:** 20.x or 22.x (highest available; Next 16 needs Node >= 18.18).
- **Application mode:** Production.
- **Application root:** `portal_app` (creates `~/portal_app`).
- **Application URL:** `portal.causq.com`.
- **Application startup file:** `server.js`.
- Create. Leave the page open (it shows the env-var editor and Restart button).

## Step C — Upload the bundle

1. cPanel → **File Manager** → go to `~/portal_app`.
2. Upload **`portal-deploy.zip`** (provided).
3. **Extract** it in place so that `server.js`, `node_modules/`, `.next/`, `public/`,
   `package.json` sit **directly** in `~/portal_app` (not in a nested folder). If the zip
   extracts into a subfolder, move the contents up one level.

## Step D — Environment variables

In **Setup Node.js App** → your app → **Environment variables**, add (Name = Value):

```
NEXT_PUBLIC_SUPABASE_URL        = https://krpmwhwayccphqnzlpff.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = sb_publishable_mftenH6RaxAYc0h67oBSyA_TY1RKcag
SUPABASE_SERVICE_ROLE_KEY       = <your sb_secret_... service role key>
```

Optional (enable later as the integrations come online):

```
MAILERSEND_API_KEY      = <mailersend key>          # new-message email notifications
PORTAL_FROM_EMAIL       = hello@causq.com
STRIPE_SECRET_KEY       = <stripe secret>           # invoice Pay-now
STRIPE_WEBHOOK_SECRET   = <stripe webhook secret>
```

(`NEXT_PUBLIC_*` must be present at runtime too, since server components read
`process.env` at request time, not just at build.)

## Step E — Start

- Click **Restart** (or **Run JS script** is not needed). Passenger sets `PORT`; the
  standalone `server.js` listens on it automatically.
- Visit `https://portal.causq.com` → you should see the portal landing; `/portal/login`
  should render the sign-in card.

## Step F — Point Supabase Auth at the domain

Supabase dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://portal.causq.com`
- **Redirect URLs:** add `https://portal.causq.com/auth/callback`

This is required for magic-link and OAuth redirects to land back on the app.

## Step G — First admin (after first sign-in)

1. Go to `https://portal.causq.com/portal/login`, request a magic link with **your** email,
   click it. You will land on `/portal/pending` (new accounts are pending).
2. Promote yourself to admin (run via the Supabase MCP `execute_sql` or the SQL editor):

```sql
update public.profiles
set role = 'admin', status = 'active'
where email = 'YOUR_EMAIL_HERE';
```

3. Visit `https://portal.causq.com/admin` — you can now run the portal.

## Step H — Marketing site link (optional)

Add a "Client login" link to the marketing nav/footer pointing to
`https://portal.causq.com` (in `assets/js/main.js`, bump the `?v=` cache-bust).

---

## Troubleshooting (Passenger)

- **502 / app won't boot:** check the Passenger log (Setup Node.js App shows the log path,
  or `~/portal_app/stderr.log`). Most common: startup file not `server.js`, or contents
  nested in a subfolder, or wrong Node version.
- **Styles/JS 404:** `.next/static` must be present under `~/portal_app/.next/static` and
  `public/` at the app root (both are included in the zip).
- **Auth redirect fails:** Step F not done, or the redirect URL doesn't exactly match.
- **Rebuild later:** re-run `output:"standalone"` build locally, re-zip
  `.next/standalone` + `.next/static` + `public`, re-upload, Restart.

## What needs your accounts (still pending)

- Google + Microsoft OAuth app registrations (then add the client IDs/secrets in Supabase
  dashboard → Authentication → Providers; redirect URL
  `https://krpmwhwayccphqnzlpff.supabase.co/auth/v1/callback`).
- MailerSend API key (notifications) and Stripe keys + `stripe listen`/webhook endpoint
  `https://portal.causq.com/api/stripe/webhook` (payments).
- Magic-link email works out of the box on Supabase's built-in mailer (rate-limited);
  for volume, configure a custom SMTP in Supabase Auth.
