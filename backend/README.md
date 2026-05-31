# CausQ API (Rust · Axum · SQLite)

A small, fast backend that serves the static marketing site **and** stores form
submissions in a SQLite database. Chosen for a tiny memory footprint, a single
self-contained binary, and zero runtime dependencies.

## Stack
| Concern        | Choice                          |
|----------------|---------------------------------|
| Language       | Rust (2021)                     |
| HTTP framework | [Axum](https://github.com/tokio-rs/axum) 0.7 |
| Async runtime  | Tokio                           |
| Database       | SQLite via [SQLx](https://github.com/launchbadge/sqlx) 0.8 (async) |
| Static serving | tower-http `ServeDir` (+ brotli)|
| Schema         | `db/schema.sql` (idempotent, embedded at compile time) |

## Run

```bash
cd backend
cp .env.example .env          # optional — sensible defaults exist
cargo run                     # first build pulls crates, then starts on :8080
```

Open <http://localhost:8080> — the Rust app serves the site from the project
root (`STATIC_DIR=..`) and the API under `/api/*`, so the frontend `fetch()`
calls hit the same origin with no CORS fuss.

Release build (single optimized binary):

```bash
cargo build --release
DATABASE_URL=sqlite://causq.db ./target/release/causq-api
```

## API

| Method | Path             | Body (JSON)                                   | Stores in     |
|--------|------------------|-----------------------------------------------|---------------|
| GET    | `/api/health`    | —                                             | —             |
| POST   | `/api/contact`   | `name, email, company?, region?, interest?, message?` | `leads`      |
| POST   | `/api/subscribe` | `name?, email`                                | `subscribers` |
| POST   | `/api/apply`     | `name, email, role?, region?, link?, message?`| `applications`|
| GET    | `/api/roles`     | —                                             | `roles`       |
| GET    | `/api/insights`  | —                                             | `insights`    |

Example:

```bash
curl -X POST localhost:8080/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane","email":"jane@acme.com","interest":"Quantum-era Security"}'
```

## Reading what comes in

```bash
sqlite3 causq.db "SELECT created_at,name,email,interest FROM leads ORDER BY id DESC;"
```

## Notes
- The schema is applied on every start and is safe to re-run.
- `careers.html` and `what-we-think.html` progressively enhance from `/api/roles`
  and `/api/insights`; if the API isn't running they fall back to static markup.
- For production, put this behind a reverse proxy (TLS) and forward new `leads`
  to your CRM/email — there's a single insertion point per handler in `main.rs`.
