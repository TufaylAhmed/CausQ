# CausQ

Marketing website + backend for **CausQ** — a consultancy helping enterprises
across the **US and EMEA** master **AI**, **network modernization** and
**quantum-era security**.

Editorial, Accenture-inspired multi-page design with a single signature accent
(the brand orange `#fb4d17`). Distinctive type — *Bricolage Grotesque*,
*Hanken Grotesk*, *Newsreader*, *IBM Plex Mono*.

## Structure

```
CausQ/
├── index.html              Home
├── what-we-do.html         Capabilities (AI · Network · Quantum · Cloud)
├── what-we-think.html      Insights / thought leadership
├── who-we-are.html         Company, values, leadership
├── careers.html            Open roles + application form
├── contact.html            Book-a-briefing form
├── assets/
│   ├── css/styles.css      Shared design system
│   ├── js/main.js          Shared behaviour (nav/footer injection, forms, reveals)
│   ├── img/                ← drop your own photos here (see img/README.md)
│   └── logos/              ← drop partner SVGs here (see logos/README.md)
└── backend/                Rust (Axum) API + SQLite
    ├── Cargo.toml
    ├── db/schema.sql       Database schema (leads, applications, subscribers, roles, insights)
    └── src/{main,db,models}.rs
```

## View the site

**Quick look (no backend):** open `index.html` in a browser. Forms show a
local confirmation; image and logo slots show labelled placeholders.

**Full stack (recommended):** the Rust app serves the site *and* the API on one
origin, so forms persist to the database:

```bash
cd backend
cargo run            # → http://localhost:8080
```

See [`backend/README.md`](backend/README.md) for the API reference.

## Tech

- **Frontend:** dependency-free HTML/CSS/modern JS (ES modules-style). Fast,
  SEO-friendly, deploys to any static host.
- **Backend:** Rust + Axum + SQLx (SQLite). One small binary; schema lives in a
  dedicated `.sql` file.

## Make it yours — quick checklist

1. **Images** — add photos to `assets/img/` (filenames listed in its README).
2. **Logos** — add official partner SVGs to `assets/logos/` (or edit the
   `PARTNERS` list in `assets/js/main.js`).
3. **Copy** — replace placeholder leadership names/bios in `who-we-are.html`
   and office details in `contact.html`.
4. **Leads** — in `backend/src/main.rs`, forward new `leads` to your CRM/email.
5. **Deploy** — static host for the frontend, or run the Rust binary behind a
   TLS reverse proxy to get the database too.
