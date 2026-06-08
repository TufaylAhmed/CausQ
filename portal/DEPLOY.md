# Portal deployment (automatic)

The portal deploys itself. Push a change under `portal/` to `main` and GitHub
Actions builds the Next.js standalone bundle and ships it to the cPanel host
over SSH, then restarts Passenger. No zip, no manual upload.

Workflow: [`.github/workflows/deploy-portal.yml`](../.github/workflows/deploy-portal.yml)

```
git push origin main   →   Actions: npm ci + build   →   rsync to ~/portal_app   →   touch tmp/restart.txt
```

The marketing site (causq.com) still deploys separately via cPanel Git Version
Control + `.cpanel.yml`. This pipeline only touches the portal.

---

## One-time setup

### 1. Enable SSH on Namecheap
cPanel → **SSH Access** → make sure shell access is on (Namecheap shared plans
support it; you may need to request activation once). Note the **server
hostname** and **SSH port** (shared cPanel is usually `21098`, not 22).

### 2. Create a deploy key
On your machine:
```bash
ssh-keygen -t ed25519 -f causq_portal_deploy -N "" -C "github-actions-portal-deploy"
```
- Add the **public** key (`causq_portal_deploy.pub`) to the host:
  cPanel → SSH Access → **Manage SSH Keys** → Import (public key) → **Authorize**.
  (Or append it to `~/.ssh/authorized_keys` on the server.)
- The **private** key (`causq_portal_deploy`) goes into the `SSH_KEY` secret below.

### 3. Add GitHub repo secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `SSH_HOST` | server hostname, e.g. `serverNNN.web-hosting.com` |
| `SSH_PORT` | e.g. `21098` |
| `SSH_USER` | cPanel user, e.g. `faazcvhi` |
| `SSH_KEY` | full contents of the **private** key file |
| `PORTAL_PATH` | `/home/faazcvhi/portal_app` |
| `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` (build-time, inlined) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `.env.local` (build-time, inlined) |
| `NEXT_PUBLIC_SITE_URL` | `https://portal.causq.com` |

Runtime secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`, `MAILERSEND_API_KEY`, `PORTAL_FROM_EMAIL`) are
**not** added here. They live in the server's `.env` in `~/portal_app`, which
the deploy never overwrites. Set/rotate them on the host directly.

### 4. First run
After the secrets exist: repo → **Actions → Deploy portal → Run workflow**
(or push any change under `portal/`). Watch the run; the final “Smoke check”
step hits `portal.causq.com/portal/login` and expects HTTP 200.

---

## What the deploy does on the server
- `rsync --delete` replaces `.next/`, `public/`, and `node_modules/` with the
  freshly built standalone bundle.
- Leaves `.env`, `.htaccess`, and `tmp/` untouched.
- `chmod -R u+rwX,go+rX .next public` so static assets serve (avoids the logo
  403 seen on manual deploys).
- `touch tmp/restart.txt` so Passenger loads the new code (it caches the app in
  memory and won't pick up changes without this).

## Manual fallback
If CI is unavailable, build locally and ship the standalone bundle the old way
(`npm run build`, assemble `.next` + `public`, scp/extract into `~/portal_app`,
touch `tmp/restart.txt`). The CI workflow is the source of truth for the steps.
