# CLAUDE.md — CausQ project memory

This file is the durable brief for working on the CausQ website. Read it first.
It records the project, its conventions, the stack, and the running log of what
the user has asked for so context survives across sessions.

---

## What this project is

CausQ is a consulting/services brand: it helps technology and security leaders
make the enterprise **AI-native**, **modernize the network** it runs on, and stay
**secure for the quantum era** — pitched as *one integrated system, not three
disconnected programs*. The repo is the marketing **website** (`causq.com`).

Positioning pillars:
- **AI & Intelligent Operations**
- **Network Modernization**
- **Quantum-era Security**
Plus a bench of specialised capabilities (Cybersecurity & SOC, SASE, Identity &
Zero Trust, Data Center & AI Fabric, etc.) and Consulting & Advisory.

Brand voice: engineer-led, vendor-agnostic, senior-led, "built to hand over",
global / remote-first. Substance over slideware.

---

## Tech stack & architecture

- **Static site**, hand-written HTML + a shared CSS file + a small JS file.
  No build step, no framework.
- Pages live at repo root as `*.html` (e.g. `index.html`, `what-we-do.html`,
  `xsiam-xsoar.html`, `consulting-advisory.html`, `pitch.html`, `pitch-deck.html`).
- Styles: `assets/css/styles.css` — single global stylesheet, CSS-variable driven.
- Scripts: `assets/js/main.js` — nav/footer mounts, reveal-on-scroll, counters.
- Shared chrome injected via `<div id="nav-mount"></div>` and
  `<div id="footer-mount"></div>` (populated by `main.js`).
- Images: `assets/img/` (optimized) with `_source/` holding original uploads.
  See `assets/img/README.md`. NOTE: a few images were cropped from watermarked
  comps and must be replaced with licensed versions before launch.

### Hosting / deployment (see also the `causq-deployment` skill + memory)
- Static site served from **cPanel**, fronted by **Cloudflare** CDN.
- **Forms/email** handled by a **Cloudflare Worker** ("CausQ Forms Worker") +
  **MailerSend** (transactional) and **MailerLite** (nurture/automation).
  Turnstile CAPTCHA protects the forms.
- Deploy path: push to **GitHub `main`**; the live cPanel site is updated from
  there. No working SMTP on the host — email goes through the Worker.

### Cache-busting (important, learned the hard way)
Cloudflare aggressively caches CSS/JS. When you change `styles.css` or
`main.js`, **bump the version query** on the `<link>`/`<script>` (e.g.
`styles.css?v=20260613`) in the HTML, or the live site renders stale/unstyled.

---

## Conventions & house rules

- **NO em dashes** in any written content (copy or prose). Use commas, colons,
  or periods. This is a standing copy rule. (Also recorded in auto-memory.)
- **Go global**: no geographic targeting (no US/EMEA framing). Forms use
  work-style / company-size fields, not region.
- Match the surrounding code's idiom, comment density, and naming.
- Fonts: **Albert Sans** (display), **Hanken Grotesk** (body),
  **IBM Plex Mono** (kickers/labels). Loaded from Google Fonts.
- Brand palette (CSS vars in `styles.css`):
  - `--signal` teal `#06B6D4` (logo accent; `--signal-deep` `#0891b2`)
  - `--night` `#0b0b0d` (dark sections), `--paper` `#fff`, `--paper-warm` `#f5f3ee`
  - `--ink` `#0c0c0e` headlines, `--ink-mute` `#63636c` secondary
- Kicker pattern: mono, uppercase, teal, with a small dot before it.
- Unlisted pages (e.g. the pitch) carry `<meta name="robots" content="noindex,
  nofollow">` and are shared by link, kept out of search and the sitemap.

---

## Key marketing assets

- `pitch.html` — unlisted **one-page** client/partner pitch ("The CausQ pitch").
  Has a print/PDF leave-behind mode (one section per page).
- `pitch-deck.html` — unlisted **16:9 slideshow** version of the pitch with a
  **"Download PPT" button** that generates a real `.pptx` client-side via
  **PptxGenJS** (CDN). Content is driven from a single `DECK` array so the
  on-screen slides and the downloaded PowerPoint stay in sync. Keyboard nav
  (arrows/space/Home/End), dot nav, swipe, fullscreen (F).
- `marketing/the-brief-welcome-sequence.md` — 5-email nurture sequence for
  "The Brief".
- `xsiam-xsoar.html` — Cortex XSIAM/XSOAR capability page (uses XQL, not CQL;
  hand-built SVG visuals + CSS animations, no screenshot images).

---

## Running log of user requests (most recent first)

Dates use the project's clock (mid-2026).

- **Portal Milestone 2, Phase 4: Lightweight CRM** (shipped to prod). Added
  `contacts`, `opportunities` (staff-only RLS), and `activity_log` tables. Client
  `/portal/contacts` (the CausQ team assigned to the account; clients see only
  `is_causq_staff` contacts of their org) and `/portal/account` (org overview:
  project + invoice summary with health). Staff `/admin/crm` pipeline kanban
  (opportunities by stage with value sums + stage moves), `/admin/crm/contacts`
  manager, and `/admin/crm/[orgId]` org detail with a unified activity timeline +
  note composer. Stage changes/notes/adds log to `activity_log`. Nav: Contacts +
  Account in the portal, CRM in the admin. pgTAP proves clients cannot read
  opportunities/activity. Next: Phase 5 (staff metrics dashboard, Recharts).
- **Portal Milestone 2, Phase 3: Projects upgrade** (shipped to prod). Added a
  `tasks` table (RLS: own-org read, staff write) and an `engagement_health`
  security_invoker view (milestone completion minus an overdue-task penalty).
  Moved the engagement detail to `/portal/projects/[id]` (old
  `/portal/engagements/[id]` now redirects, preserving stored notification links);
  added `/portal/projects/[id]/tasks` (kanban board, staff add/move/remove).
  Clients can upload files to `{org}/projects/{id}/client-uploads/` via a storage
  insert policy + `record_client_document()` RPC (10 MB + mime limits). Health
  shows on project cards and dashboard quick links. Admin can create a project
  from a template that seeds default milestones. Notification triggers re-pointed
  at `/portal/projects` and now alert the lead on client upload. pgTAP proves task
  isolation, health, and upload path scoping. Next: Phase 4 (lightweight CRM).
- **Portal Milestone 2, Phase 2B: Invoice workflow** (shipped to prod). Added
  `invoice_line_items` (RLS: own-org read, staff write); a client invoice detail
  page `/portal/invoices/[id]` with line items, a derived status timeline, pay
  button and PDF download; an admin detail page `/admin/invoices/[id]` for status
  control, PDF upload to the org-scoped `documents` path, and line-item editing;
  a MailerSend payment receipt sent from the Stripe webhook when an invoice is
  marked paid; and an overdue count on the dashboard Outstanding KPI. pgTAP proves
  line-item isolation. Next: Phase 3 (projects/tasks).
- **Portal Milestone 2, Phase 2A: Dashboard + Notifications** (shipped to prod).
  Turned `/portal` from an engagements list into a KPI dashboard (active
  projects, outstanding invoices, milestones due in 14d, unread messages) with a
  unified 30-day activity feed; moved the engagements list to `/portal/projects`.
  Added an in-app notification system: `notifications` table (profile + org
  scoped RLS), DB triggers that fire on staff message / new document / invoice
  sent-or-overdue / milestone done, RPCs `mark_notification_read`,
  `mark_all_notifications_read`, `unread_notification_count`, a
  `/portal/notifications` page (all/unread filter), and a bell + unread badge in
  `PortalShell`. pgTAP proves org/user isolation. Prod Supabase migration applied
  via MCP (project `krpmwhwayccphqnzlpff`); app shipped through the
  deploy-portal Action. Next: Phase 2B (invoice workflow).
- **Create this `CLAUDE.md`** to remember everything asked.
- **Recreate the pitch as a downloadable slideshow** → built `pitch-deck.html`
  (16:9 deck + "Download PPT" button via PptxGenJS, single source of truth).
- **Pitch deck print/PDF leave-behind** (one section per page) on `pitch.html`.
- **Add unlisted client/partner pitch deck** → `pitch.html`.
- **Go global**: removed all geography (US/EMEA) sitewide; added specialised
  capabilities; refactored form fields from geographic to work-style/company-size.
- **XSIAM page**: CQL→XQL, fixed mobile feature grid + terminal alignment;
  rebuilt hero + XSOAR playbook visuals as hand-built SVG/CSS (removed image deps);
  fixed stale-cache unstyled render via CSS versioning + cache-bust.
- **Consulting & Advisory page**: created page w/ SEO + parallax hero; added FAQ
  accordion; fixed invisible "see all capabilities" link in dark-hero nav.
- **Forms/email stack**: deployed Cloudflare Worker + MailerSend/MailerLite +
  Turnstile; documented in the `causq-deployment` skill.
- **Standing rule established**: never use em dashes in copy.

---

## Gotchas / things to remember

- Bump `?v=` on CSS/JS links after edits, or Cloudflare serves stale assets.
- Email cannot be sent via host SMTP; it routes through the Worker.
- Some `assets/img/*` are watermarked comps pending licensed replacements.
- Keep the pitch pages `noindex,nofollow` and out of the sitemap.
- There is an auto-memory index at the user's memory dir (`MEMORY.md`); this
  `CLAUDE.md` is the in-repo, project-scoped counterpart.
