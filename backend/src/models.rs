//! Request / response data shapes shared across routes.

use serde::{Deserialize, Serialize};

/// POST /api/contact
#[derive(Debug, Deserialize)]
pub struct LeadInput {
    pub name: String,
    pub email: String,
    #[serde(default)]
    pub company: Option<String>,
    #[serde(default)]
    pub region: Option<String>,
    #[serde(default)]
    pub interest: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

/// POST /api/subscribe
#[derive(Debug, Deserialize)]
pub struct SubscribeInput {
    #[serde(default)]
    pub name: Option<String>,
    pub email: String,
}

/// POST /api/apply
#[derive(Debug, Deserialize)]
pub struct ApplicationInput {
    pub name: String,
    pub email: String,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub region: Option<String>,
    #[serde(default)]
    pub link: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

/// GET /api/roles
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Role {
    pub id: i64,
    pub title: String,
    pub team: String,
    pub location: String,
}

/// GET /api/insights
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Insight {
    pub id: i64,
    pub slug: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub category: Option<String>,
    pub read_min: Option<i64>,
    pub image: Option<String>,
}

/// Generic OK envelope.
#[derive(Debug, Serialize)]
pub struct Ack {
    pub ok: bool,
    pub id: Option<i64>,
    pub message: &'static str,
}

impl Ack {
    pub fn created(id: i64) -> Self {
        Self { ok: true, id: Some(id), message: "received" }
    }
}
