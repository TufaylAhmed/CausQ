//! CausQ API
//! -----------------------------------------------------------------------------
//! A small, fast Axum service that:
//!   * serves the static marketing site (../  → the project root) and
//!   * exposes JSON endpoints backed by SQLite for leads, applications,
//!     newsletter subscribers, open roles and insights.
//!
//! Run:  DATABASE_URL=sqlite://causq.db cargo run
//! Then: http://localhost:8080

mod db;
mod mailer;
mod models;

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use lettre::message::Mailbox;
use mailer::Mailer;
use models::*;
use sqlx::SqlitePool;
use std::{env, net::SocketAddr, path::PathBuf};
use tower_http::{
    cors::{Any, CorsLayer},
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

#[derive(Clone)]
struct AppState {
    pool: SqlitePool,
    mailer: Mailer,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "causq_api=info,tower_http=info".into()),
        )
        .init();

    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://causq.db".into());
    let port: u16 = env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8080);
    // Directory holding the built frontend (defaults to the project root above /backend).
    let static_dir = env::var("STATIC_DIR").unwrap_or_else(|_| "..".into());

    let pool = db::init(&database_url).await?;
    let mailer = Mailer::from_env();
    let state = AppState { pool, mailer };

    let api = Router::new()
        .route("/health", get(health))
        .route("/contact", post(create_lead))
        .route("/subscribe", post(create_subscriber))
        .route("/apply", post(create_application))
        .route("/roles", get(list_roles))
        .route("/insights", get(list_insights));

    let serve_dir = ServeDir::new(PathBuf::from(&static_dir))
        .append_index_html_on_directories(true)
        .not_found_service(ServeFile::new(format!("{static_dir}/index.html")));

    let app = Router::new()
        .nest("/api", api)
        .fallback_service(serve_dir)
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("CausQ API listening on http://{addr}  (static: {static_dir})");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

// --------------------------------------------------------------------- handlers

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "ok": true, "service": "causq-api" }))
}

async fn create_lead(
    State(st): State<AppState>,
    Json(input): Json<LeadInput>,
) -> Result<impl IntoResponse, ApiError> {
    if input.name.trim().is_empty() || !input.email.contains('@') {
        return Err(ApiError::bad("name and a valid email are required"));
    }
    let id = sqlx::query(
        "INSERT INTO leads (name,email,company,region,interest,message,source)
         VALUES (?,?,?,?,?,?, 'contact')",
    )
    .bind(input.name.trim())
    .bind(input.email.trim())
    .bind(&input.company)
    .bind(&input.region)
    .bind(&input.interest)
    .bind(&input.message)
    .execute(&st.pool)
    .await?
    .last_insert_rowid();

    // Fire the emails. A mail failure must NOT fail the request — the lead is
    // already safely stored — so we log and carry on.
    let notify_body = mailer::lead_notification(
        input.name.trim(),
        input.email.trim(),
        input.company.as_deref(),
        input.region.as_deref(),
        input.interest.as_deref(),
        input.message.as_deref(),
    );
    let _ = st
        .mailer
        .send_text(
            st.mailer.notify_to.clone(),
            &format!("New briefing request: {}", input.name.trim()),
            notify_body,
        )
        .await;

    if let Ok(lead_box) = input.email.trim().parse::<Mailbox>() {
        let _ = st
            .mailer
            .send_text(
                lead_box,
                "We've got your request",
                mailer::lead_confirmation(input.name.trim()),
            )
            .await;
    }

    Ok((StatusCode::CREATED, Json(Ack::created(id))))
}

async fn create_subscriber(
    State(st): State<AppState>,
    Json(input): Json<SubscribeInput>,
) -> Result<impl IntoResponse, ApiError> {
    if !input.email.contains('@') {
        return Err(ApiError::bad("a valid email is required"));
    }
    // Upsert: ignore duplicates on the unique email index.
    let id = sqlx::query(
        "INSERT INTO subscribers (name,email) VALUES (?,?)
         ON CONFLICT(email) DO UPDATE SET name = COALESCE(excluded.name, subscribers.name)",
    )
    .bind(&input.name)
    .bind(input.email.trim())
    .execute(&st.pool)
    .await?
    .last_insert_rowid();

    // Send the welcome email (Email 1 of "The Brief"). Log-and-continue on failure.
    if let Ok(sub_box) = input.email.trim().parse::<Mailbox>() {
        let _ = st
            .mailer
            .send_text(
                sub_box,
                "Welcome to The Brief: start here",
                mailer::subscriber_welcome(input.name.as_deref()),
            )
            .await;
    }
    // Optional: let the team know someone subscribed.
    let _ = st
        .mailer
        .send_text(
            st.mailer.notify_to.clone(),
            "New Brief subscriber",
            format!("New subscriber: {}\n", input.email.trim()),
        )
        .await;

    Ok((StatusCode::CREATED, Json(Ack::created(id))))
}

async fn create_application(
    State(st): State<AppState>,
    Json(input): Json<ApplicationInput>,
) -> Result<impl IntoResponse, ApiError> {
    if input.name.trim().is_empty() || !input.email.contains('@') {
        return Err(ApiError::bad("name and a valid email are required"));
    }
    let id = sqlx::query(
        "INSERT INTO applications (name,email,role,region,link,message)
         VALUES (?,?,?,?,?,?)",
    )
    .bind(input.name.trim())
    .bind(input.email.trim())
    .bind(input.role)
    .bind(input.region)
    .bind(input.link)
    .bind(input.message)
    .execute(&st.pool)
    .await?
    .last_insert_rowid();

    Ok((StatusCode::CREATED, Json(Ack::created(id))))
}

async fn list_roles(State(st): State<AppState>) -> Result<impl IntoResponse, ApiError> {
    let roles = sqlx::query_as::<_, Role>(
        "SELECT id,title,team,location FROM roles WHERE is_open = 1 ORDER BY sort, id",
    )
    .fetch_all(&st.pool)
    .await?;
    Ok(Json(roles))
}

async fn list_insights(State(st): State<AppState>) -> Result<impl IntoResponse, ApiError> {
    let items = sqlx::query_as::<_, Insight>(
        "SELECT id,slug,title,excerpt,category,read_min,image
         FROM insights WHERE published = 1 ORDER BY created_at DESC, id DESC",
    )
    .fetch_all(&st.pool)
    .await?;
    Ok(Json(items))
}

// --------------------------------------------------------------------- errors

struct ApiError {
    status: StatusCode,
    msg: String,
}

impl ApiError {
    fn bad(msg: &str) -> Self {
        Self { status: StatusCode::BAD_REQUEST, msg: msg.to_string() }
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(e: sqlx::Error) -> Self {
        tracing::error!("db error: {e}");
        Self { status: StatusCode::INTERNAL_SERVER_ERROR, msg: "internal error".into() }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        (self.status, Json(serde_json::json!({ "ok": false, "error": self.msg }))).into_response()
    }
}
