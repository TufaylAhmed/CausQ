//! Database pool setup + schema bootstrap.
//!
//! Uses SQLite via SQLx. The schema in `db/schema.sql` is applied on every
//! start and is fully idempotent (`CREATE TABLE IF NOT EXISTS`, seeded with
//! `INSERT OR IGNORE`), so first run creates the database and subsequent runs
//! are no-ops.

use anyhow::Context;
use sqlx::sqlite::{SqlitePoolOptions, SqliteConnectOptions};
use sqlx::SqlitePool;
use std::str::FromStr;

/// Build the connection pool, creating the database file if needed, then apply
/// the schema.
pub async fn init(database_url: &str) -> anyhow::Result<SqlitePool> {
    let opts = SqliteConnectOptions::from_str(database_url)
        .context("invalid DATABASE_URL")?
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(opts)
        .await
        .context("failed to open SQLite pool")?;

    apply_schema(&pool).await?;
    Ok(pool)
}

async fn apply_schema(pool: &SqlitePool) -> anyhow::Result<()> {
    // Embedded at compile time so the binary is self-contained.
    let schema = include_str!("../db/schema.sql");

    // SQLx's simple-query protocol runs multiple `;`-separated statements.
    for stmt in schema.split(';') {
        let trimmed = stmt.trim();
        if trimmed.is_empty() {
            continue;
        }
        sqlx::query(trimmed)
            .execute(pool)
            .await
            .with_context(|| format!("schema statement failed: {trimmed:.60}"))?;
    }
    Ok(())
}
