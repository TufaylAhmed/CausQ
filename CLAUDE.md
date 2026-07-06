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

- **Homepage polish pass: counters, comparison, subscribe, autoplay, photos**
  (2026-07-07, commits `05e9658` + `ca91824`, deployed and verified live). Five
  user asks in one pass. (1) Design-build stat counters: root cause of the tiny
  numbers was `.sq-stat span`'s .62rem mono label rule also matching the
  animated `[data-count]` span inside `<b>`; scoped to `.sq-stat > span`,
  numerals now clamp(2.3rem,3vw,3rem) with the times/percent unit as a smaller
  cyan `<i>` symbol (final CTA counter matched). (2) What-you-get comparison
  rebuilt with shadcn-style round icon chips (teal check / muted check /
  half-moon Partial / x No, inset-shadow rings + tiny mono labels, row hover);
  also collapses to stacked labelled cards under 820px (from `05e9658`).
  (3) The Brief subscribe form added to the homepage's custom `sq-footer`
  (it was lost when the homepage stopped using the shared footer); plain
  `form[data-endpoint="/api/subscribe"]` markup, main.js wires submit/success/
  Turnstile automatically. (4) Capability catalog auto-advances every 4.5s via
  IntersectionObserver (only while on screen; pauses on hover/focus, resets on
  manual pick, respects reduced motion). (5) Placeholder photos from
  `assets/img/` layered UNDER the blueprint line art (teal wash + dot grid over
  the image, white strokes on top) on the catalog card (per-capability,
  cross-fading), the four how-we-work steps and three engage-mode tiles; user
  will swap the images later. GOTCHA learned: a relative `url()` placed in a
  CSS custom property from JS resolves against the stylesheet URL
  (`assets/css/`), not the page — resolve with `new URL(path, document.baseURI)`
  first. Cache-bust `home.css`/`home.js` at `v=20260707a`.
- **Apple-glass header + animated logo** (2026-07-06, commit `614c881`, live).
  Homepage nav is now near-transparent dark glass (saturate 180% + blur 20px)
  over the dark hero, thinning to translucent white glass on scroll; global
  scrolled bar lightened .78 to .6. Homepage body gained the `dark-hero` class
  (white links, inverted wordmark) plus a menu-open exception so the inverted
  logo returns to ink on the white mobile overlay. Logo lockup animates: the
  wordmark slides in on load, the signal dot pops on after it, hover lifts the
  mark with a teal glow and speeds the radar pings; reduced-motion disables
  the entrance. Cache-bust to `?v=20260706a` on styles.css (22 pages) +
  home.css. Deployed via SSH pull and verified live.
- **Zero-trust access-fabric section added to the homepage** (2026-07-05,
  commit `f7056ea`, live). The user pointed at Tailark Pro block
  `hero-section-16` (`npx shadcn add @tailark-pro/hero-section-16`); the pro
  registry needs an API key we don't have, so the block's public preview was
  studied and its schematic-board structure rebuilt natively in the sq-
  design system (no React/Tailwind). New section `[3/10]` "Zero trust fabric"
  (`#zero-trust`, `.sq-zt-*` in home.css): blueprint dot-grid board with an
  IDENTITY chip wired by self-drawing SVG traces to a live ACCESS REQUEST
  card (user / device / posture / segment rows stagger in, ALLOW verdict
  pops), a pulsing SESSION VERIFIED pill, a policy-as-code panel, then three
  feature columns (identity-first access, microsegmentation, continuous
  verification). Sections renumbered [n/9] to [n/10]. Board stacks vertically
  under 820px. home.css `?v=20260705d`.

- **Homepage: Cal.com CTA + drenched footer + hero/ticker polish** (2026-07-05,
  commit `ce1bd6c`). "Talk to sales" (hero ghost CTA) and "Book a briefing"
  (final CTA + footer) now open `https://cal.com/causq/30min?overlayCalendar=true`
  in a new tab, same pattern as supermemory.ai (plain link, no embed script).
  The Cal.com account is username `causq` (hello@causq.com) with public event
  types `15min` and `30min`; the API key is SECRET, server-side only, never in
  site code or the repo. The homepage watermark band + shared footer were
  replaced by a supermemory-structure "drenched" footer in brand teal
  (`.sq-footer` in home.css: editorial h2 + mono-labelled link columns +
  right-aligned mono copyright + giant translucent "CausQ." wordmark with a
  white rounded logo badge that scrolls back to top). The hero dot grid was
  made stronger, the partner marquee stripped to a quiet supermemory-style
  grayscale ticker (no barrier lines, no glass hover, pointer-events none),
  and the nav logo dot restored to round. Inner pages keep the shared footer
  and marquee styling. home.css bumped to `?v=20260705b`.
- **Primary checkout moved to `~/dev/CausQ`** (2026-07-05). OneDrive turned
  ~24k files in the old Documents checkout into cloud-only placeholders that
  fail to hydrate (reads time out), which corrupted its `.git`. The user asked
  to move the project out of Documents; `~/dev/CausQ` is now the primary
  working copy (full clone, `main` + `feat/client-portal`). Work and launch
  Claude from `~/dev/CausQ`, NOT the OneDrive path. The old OneDrive folder is
  kept only as a recovery source for still-stuck untracked files, most
  importantly `portal/.env.local` and `backend/.env` (secrets, not in git);
  once those hydrate, copy them over and the OneDrive folder can be deleted.
- **Homepage rebuilt on the supermemory.ai structure** (2026-07-05, branch
  `redesign/context-grid`, commit `92a3269`; merged to `main` and pushed to
  GitHub on 2026-07-05, `c05f63d..9dc4b04`). The
  user rejected the earlier redesign attempts and asked to restart from `main`
  (`c05f63d`), analyze supermemory.ai in the browser, and clone its homepage
  structure for causq.com in white + teal. Shipped as a full `index.html`
  rewrite plus a scoped `assets/css/home.css` + `assets/js/home.js` layer
  (loaded only by the homepage; styles.css, main.js and all 22 inner pages
  untouched). Structure mirrors supermemory 1:1: dot-grid hero with badge pill,
  segmented CTAs and a copyable `$ hello@causq.com` terminal row; sticky mono
  section-index bars `[1/9]`-`[9/9]`; a capability catalog (numbered 01-08 tab
  list swapping hand-built blueprint SVG cards); a teal/white two-card "what we
  do" split with a stat strip; 01-04 how-we-work step cards; a proof section
  with dashed spec panels and a CausQ vs big-consultancy vs staff-augmentation
  comparison table; an engagements card carousel; engagement modes + trust
  band; a teal point-of-view band (SVG bar chart + giant 3x stat) and pull
  quote; ways-of-working plan cards; a numbered one-open-at-a-time FAQ; a final
  CTA with rotating boxed word ("Your [network] needs its CausQ."); and a giant
  watermark wordmark band above the shared footer. Zero border-radius inside
  the homepage, teal `#0E7490`-`#083344` gradient cards, brand fonts kept.
  NOTE: worked from a scratchpad GitHub clone because the OneDrive checkout had
  dataless placeholder files that hung git (mmap timeouts). Resolved 2026-07-05:
  the broken `.git` was swapped for a fresh clone from GitHub (old one kept at
  `.git-broken-20260705/`), tracked placeholder files were re-materialized from
  HEAD, and the working clone was rescued to `~/dev/causq-site`. ~24k untracked
  files under `portal/` etc. (incl. `.env` files) remain cloud-only until
  OneDrive hydrates them.
- **Google Analytics 4 added sitewide** (2026-06-14). Wired GA4 property
  `G-9E2P7FB4HZ` (gtag.js) into the site. Loaded once from `assets/js/main.js`
  via a small `initAnalytics()` IIFE at the top of the file, so every page that
  uses the shared script is tracked from a single source; it early-returns on
  `file://` so local previews stay out of the property. `pitch-deck.html` is the
  only page that does not load `main.js` (standalone PptxGenJS slideshow), so the
  standard gtag snippet is inlined in its `<head>`. Bumped the cache-bust to
  `main.js?v=20260620` across all 23 pages. Committed (`93b3209`), pushed to
  `main`, pulled onto the prod docroot over SSH, and verified live (CDN `main.js`
  carries `initAnalytics` + the GA id, homepage references `?v=20260620`, pages
  HTTP 200).
- **Homepage v2 redesign, then reverted** (2026-06-12 / 13). Built a "Live Grid"
  dark-mode homepage on `index.html` (commit `3bcac8e`), inspired by mitigata.com
  but adapted to CausQ's brand: near-black canvas with electric teal (`--signal`),
  a live-status hero chip, a word-cycling headline (AI-native / quantum-safe /
  self-healing / always on), an animated SVG "living grid" backdrop, an operations
  ticker marquee, three "forces" console cards with animated SVG miniatures, a
  restyled stats band, a redesigned partners wall, a signals article row, a
  radial-glow CTA band, and a permanent dark glass nav. It shipped as an **additive
  v2 CSS/JS layer** (extra rules in `styles.css`, `initWordCycle()` in `main.js`)
  so the 22 inner pages stayed on the light system, untouched. A revert checkpoint
  was tagged `design-v1-checkpoint` before going live. **The user reviewed it and
  asked to revert.** Reverted via commit `11c1ba9` (tree now matches
  `design-v1-checkpoint` exactly: the v2 CSS/JS layer removed, `index.html` back to
  the v1 "Engineering what's next." hero), pushed to `main`, and pulled on the prod
  docroot over SSH. Verified live: v1 hero restored, zero v2 markers in the HTML,
  assets at `?v=20260619`, all pages HTTP 200. The redesign is **not lost** — it
  lives in history at commit `3bcac8e` / tag `design-v1-checkpoint` if revisited.
- **Portal Milestone 2 COMPLETE** (Phases 2A, 2B, 3, 4, 5 all shipped to prod
  2026-06-11/12). The client portal is now a full workspace: dashboard +
  notifications, full invoice lifecycle, projects/tasks with health, lightweight
  CRM, and a staff metrics dashboard.
- **Portal Milestone 2, Phase 5: Staff metrics dashboard** (shipped to prod).
  `staff_dashboard_metrics()` and `ar_aging_report()` SECURITY DEFINER RPCs
  (staff-guarded, revoked from PUBLIC). `/admin/dashboard` with KPI cards (active
  projects, revenue MTD, outstanding, overdue, pending approvals, open pipeline)
  and an AR-aging bar chart (**Recharts**, client component, server-fetched data).
  CSV export route handlers for invoices and engagements (`/admin/dashboard/
  export/{invoices,engagements}`, staff-gated, return 401 unauthed). Metrics added
  to the admin nav. pgTAP proves clients get `forbidden` and metrics match raw
  queries. (Recharts is the portal's only added dependency this milestone.)
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
