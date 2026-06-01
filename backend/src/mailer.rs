//! CausQ mailer
//! -----------------------------------------------------------------------------
//! Sends transactional email over SMTP via `lettre` (async, rustls TLS).
//!
//! Configuration is read from the environment at startup:
//!   SMTP_HOST      e.g. mail.causq.com         (required to enable sending)
//!   SMTP_PORT      default 587                  (587 = STARTTLS submission)
//!   SMTP_USER      SMTP auth username           (usually the full mailbox)
//!   SMTP_PASS      SMTP auth password
//!   SMTP_INSECURE  "1"/"true" → plaintext, no TLS, no auth (LOCAL TESTING ONLY)
//!   MAIL_FROM      e.g. "CausQ <hello@causq.com>"  (default: hello@causq.com)
//!   MAIL_TO        where lead/subscriber notifications land (default: MAIL_FROM)
//!
//! If SMTP_HOST is unset the mailer is DISABLED: every send is logged as a clear
//! WARN and skipped. It never silently pretends to have sent mail.

use lettre::{
    message::{header::ContentType, Mailbox, Message},
    transport::smtp::authentication::Credentials,
    Address, AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
};
use std::env;

/// Parse either a full mailbox ("Name <addr>") or a bare address ("addr").
fn parse_mailbox(s: &str) -> Option<Mailbox> {
    let s = s.trim();
    if let Ok(mb) = s.parse::<Mailbox>() {
        return Some(mb);
    }
    s.parse::<Address>().ok().map(|addr| Mailbox::new(None, addr))
}

#[derive(Clone)]
pub struct Mailer {
    transport: Option<AsyncSmtpTransport<Tokio1Executor>>,
    from: Mailbox,
    pub notify_to: Mailbox,
}

impl Mailer {
    /// Build the mailer from environment variables. Always returns a Mailer;
    /// when SMTP is not configured the mailer is in "disabled" mode.
    pub fn from_env() -> Self {
        let from = env::var("MAIL_FROM")
            .ok()
            .and_then(|s| parse_mailbox(&s))
            .unwrap_or_else(|| parse_mailbox("hello@causq.com").expect("valid fallback from"));

        let notify_to = env::var("MAIL_TO")
            .ok()
            .and_then(|s| parse_mailbox(&s))
            .unwrap_or_else(|| from.clone());

        let transport = match env::var("SMTP_HOST") {
            Ok(host) if !host.trim().is_empty() => {
                let port: u16 = env::var("SMTP_PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(587);
                let insecure = env::var("SMTP_INSECURE")
                    .map(|v| matches!(v.as_str(), "1" | "true" | "TRUE" | "yes"))
                    .unwrap_or(false);

                let mut builder = if insecure {
                    // Plaintext, no TLS — for a local SMTP debug server only.
                    AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&host)
                } else {
                    // STARTTLS submission with rustls.
                    match AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&host) {
                        Ok(b) => b,
                        Err(e) => {
                            tracing::error!("mailer: failed to build TLS relay for {host}: {e}");
                            return Self { transport: None, from, notify_to };
                        }
                    }
                }
                .port(port);

                if let (Ok(user), Ok(pass)) = (env::var("SMTP_USER"), env::var("SMTP_PASS")) {
                    if !user.is_empty() {
                        builder = builder.credentials(Credentials::new(user, pass));
                    }
                }

                tracing::info!("mailer: ENABLED via {host}:{port} (insecure={insecure})");
                Some(builder.build())
            }
            _ => {
                tracing::warn!(
                    "mailer: DISABLED — SMTP_HOST is not set. Form submissions will be stored \
                     but NO email will be sent. Set SMTP_HOST/PORT/USER/PASS to enable."
                );
                None
            }
        };

        Self { transport, from, notify_to }
    }

    /// Send a plain-text email. Logs and returns Err on failure; logs and skips
    /// (Ok) when the mailer is disabled. Never panics.
    pub async fn send_text(&self, to: Mailbox, subject: &str, body: String) -> anyhow::Result<()> {
        let Some(transport) = &self.transport else {
            tracing::warn!("mailer disabled — skipped email to {} (subject: {subject})", to);
            return Ok(());
        };

        let email = Message::builder()
            .from(self.from.clone())
            .to(to.clone())
            .subject(subject)
            .header(ContentType::TEXT_PLAIN)
            .body(body)?;

        match transport.send(email).await {
            Ok(_) => {
                tracing::info!("mailer: sent '{subject}' to {to}");
                Ok(())
            }
            Err(e) => {
                tracing::error!("mailer: FAILED to send '{subject}' to {to}: {e}");
                Err(e.into())
            }
        }
    }
}

// --------------------------------------------------------------- message bodies

/// Internal notification to CausQ when a briefing/contact request arrives.
pub fn lead_notification(
    name: &str,
    email: &str,
    company: Option<&str>,
    region: Option<&str>,
    interest: Option<&str>,
    message: Option<&str>,
) -> String {
    format!(
        "New briefing request from the CausQ site\n\
         ----------------------------------------\n\
         Name:     {name}\n\
         Email:    {email}\n\
         Company:  {}\n\
         Region:   {}\n\
         Interest: {}\n\n\
         Message:\n{}\n",
        company.unwrap_or("-"),
        region.unwrap_or("-"),
        interest.unwrap_or("-"),
        message.unwrap_or("(none)"),
    )
}

/// Confirmation sent to the person who requested a briefing.
pub fn lead_confirmation(name: &str) -> String {
    let first = name.split_whitespace().next().unwrap_or("there");
    format!(
        "Hi {first},\n\n\
         Thanks for reaching out to CausQ. We've got your request and a senior \
         engineer will be in touch within one business day to set up your briefing.\n\n\
         In the meantime, if anything's urgent just reply to this email.\n\n\
         - The CausQ team\n\
         hello@causq.com · https://causq.com\n"
    )
}

/// Welcome email (Email 1 of "The Brief" sequence) sent on subscribe.
pub fn subscriber_welcome(name: Option<&str>) -> String {
    let hello = match name.and_then(|n| n.split_whitespace().next()) {
        Some(first) if !first.is_empty() => format!("Hi {first},"),
        _ => "Welcome to The Brief,".to_string(),
    };
    format!(
        "{hello}\n\n\
         You're in. You'll get one considered email a month on the three forces \
         reshaping the enterprise: AI, the networks it runs on, and security in the \
         quantum era. Written by the engineers doing the work.\n\n\
         Start here, the piece our readers forward most:\n\n\
         \"Harvest now, decrypt later: the breach you won't see for a decade.\"\n\
         https://causq.com/article-harvest-now-decrypt-later.html\n\n\
         No noise, and you can unsubscribe in one click whenever you like.\n\n\
         - The CausQ team\n\
         hello@causq.com · https://causq.com\n"
    )
}
