# CausQ

Marketing website for **CausQ**, a consultancy that helps technology and security
leaders make the enterprise **AI-native**, **modernize the network** it runs on,
and stay **secure for the quantum era**, pitched as one integrated system, not
three disconnected programs. Engineer-led, vendor-agnostic, global / remote-first.

Positioning pillars: **AI & Intelligent Operations**, **Network Modernization**,
**Quantum-era Security**, plus a bench of specialised capabilities (Cybersecurity
& SOC, SASE, Identity & Zero Trust, Data Center & AI Fabric) and Consulting &
Advisory.

Brand accent is the signal teal `#06B6D4` on a near-white paper / deep-night
palette. Type: *Albert Sans* (display), *Hanken Grotesk* (body), *IBM Plex Mono*
(kickers / labels).

## Structure

```
CausQ/
├── index.html              Home
├── what-we-do.html         Capabilities (AI · Network · Quantum + specialised bench)
├── what-we-think.html      Insights / thought leadership
├── who-we-are.html         Company, values, leadership
├── consulting-advisory.html  Consulting & Advisory
├── xsiam-xsoar.html        Cortex XSIAM/XSOAR capability page
├── careers.html            Open roles + application form
├── contact.html            Book-a-briefing form
├── refunds.html            Cancellation & Refund policy (payment-gateway compliance)
├── pitch.html              Unlisted one-page pitch (noindex)
├── pitch-deck.html         Unlisted 16:9 deck with client-side PPTX export (noindex)
├── assets/
│   ├── css/styles.css      Shared, CSS-variable-driven design system
│   ├── js/main.js          Shared behaviour (nav/footer injection, forms, reveals)
│   └── img/                Optimized images (_source/ holds originals)
├── worker/                 Cloudflare Worker "causq-forms" (production form/email backend)
├── portal/                 Client portal app (Next.js + Supabase), deploys separately
└── backend/                Rust (Axum) API + SQLite — LOCAL DEV ONLY, not production
```

## View the site

Open `index.html` in a browser. It is a dependency-free static site (hand-written
HTML + one shared CSS file + a small JS file, no build step, no framework). Shared
chrome is injected into `<div id="nav-mount">` and `<div id="footer-mount">` by
`assets/js/main.js`.

## Architecture

- **Frontend:** static HTML/CSS/modern JS. Served from **cPanel** (Namecheap),
  fronted by **Cloudflare** CDN.
- **Forms / email:** a **Cloudflare Worker** (`worker/`) backed by **MailerSend**
  (transactional) and **MailerLite** (contact store / nurture), with Turnstile
  CAPTCHA. The Rust app in `backend/` is local-dev only; the Worker is production.
- **Client portal:** a separate **Next.js + Supabase** app in `portal/`
  (`portal.causq.com`), deployed via its own GitHub Action.

## Deploy

The site and the Worker are **two independent pipelines**:

- **Static site:** push to GitHub `main`; the live cPanel docroot (itself a git
  clone) pulls from there. After changing `styles.css` or `main.js`, bump the
  `?v=` query on the `<link>`/`<script>` tags or Cloudflare serves stale assets.
- **Worker:** `cd worker && wrangler deploy` (direct to Cloudflare, does not go
  through GitHub).

See the in-repo `causq-deployment` skill and `CLAUDE.md` for the full operations
runbook, account inventory, and conventions (including the standing no-em-dashes
copy rule and the go-global, no-geographic-targeting rule).

## Recent changes

- **Homepage v2 redesign, then reverted (2026-06-12 / 13).** A "Live Grid"
  dark-mode homepage (dark canvas, electric teal, word-cycling headline, animated
  SVG grid, ticker marquee, console cards) was built on `index.html` and shipped as
  an additive CSS/JS layer that left the inner pages untouched. After review it was
  reverted to the prior v1 design. The redesign is preserved in history at commit
  `3bcac8e` / tag `design-v1-checkpoint`.
- **Cancellation & Refund policy page** added for payment-gateway compliance.
- **Client portal Milestone 2** shipped: dashboard + notifications, full invoice
  lifecycle, projects/tasks with health, lightweight CRM, and a staff metrics
  dashboard.
