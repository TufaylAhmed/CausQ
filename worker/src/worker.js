/* ============================================================================
   CausQ — Forms Worker
   ----------------------------------------------------------------------------
   A single Cloudflare Worker that backs the site's two forms. Deploy it on the
   route  causq.com/api/*  so the static site can POST same-origin (no CORS, no
   server to run).

     POST /api/contact    briefing request  -> MailerLite (Leads group)
                                             + MailerSend confirmation to lead
                                             + MailerSend notification to team
     POST /api/subscribe  "The Brief" signup -> MailerLite (Brief group)
                                             -> MailerLite welcome automation
     POST /api/apply      careers application -> MailerLite (Careers group, if set)
                                             + MailerSend confirmation to applicant
                                             + MailerSend notification to team

   Secrets (wrangler secret put ...):
     MAILERLITE_API_KEY   MailerLite API token
     MAILERSEND_API_KEY   MailerSend API token  (optional — emails skipped if unset)

   Vars (wrangler.toml [vars]):
     ML_GROUP_BRIEF   MailerLite group id for "The Brief"
     ML_GROUP_LEADS   MailerLite group id for "Leads — Briefing Requests"
     ML_GROUP_CAREERS MailerLite group id for "Careers — Applicants" (optional)
     FROM_EMAIL       e.g. hello@causq.com   (must be a verified domain in MailerSend)
     FROM_NAME        e.g. CausQ
     NOTIFY_EMAIL     where new-lead alerts go (e.g. hello@causq.com)
============================================================================ */

const ML_API = "https://connect.mailerlite.com/api";
const MS_API = "https://api.mailersend.com/v1";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, ""); // tolerate trailing slash

    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "invalid JSON" }, 400);
    }

    try {
      // Bot protection (Cloudflare Turnstile). Active only once TURNSTILE_SECRET is set;
      // until then it's skipped so the forms keep working.
      const ip = request.headers.get("CF-Connecting-IP");
      if (!(await verifyTurnstile(env, body["cf-turnstile-response"], ip))) {
        return json({ ok: false, error: "failed bot check, please retry" }, 403);
      }
      if (path.endsWith("/api/contact")) return await handleContact(body, env);
      if (path.endsWith("/api/subscribe")) return await handleSubscribe(body, env);
      if (path.endsWith("/api/apply")) return await handleApply(body, env);
      return json({ ok: false, error: "not found" }, 404);
    } catch (err) {
      // Unexpected error — log and surface a 502 so the frontend shows its error state.
      console.error("worker error:", err && err.stack ? err.stack : err);
      return json({ ok: false, error: "upstream error" }, 502);
    }
  },
};

/* ----------------------------------------------------------------- handlers */

async function handleSubscribe(body, env) {
  const email = String(body.email || "").trim();
  if (!validEmail(email)) return json({ ok: false, error: "a valid email is required" }, 400);
  const name = clean(body.name);

  // Store the contact in MailerLite, and send the welcome email ourselves via
  // MailerSend (full control of the HTML — no reliance on MailerLite automations).
  const wb = welcomeEmail(name);
  const results = await Promise.allSettled([
    mlUpsert(env, email, { name }, env.ML_GROUP_BRIEF),
    msSend(env, { to: { email, name }, subject: wb.subject, html: wb.html, text: wb.text }),
  ]);
  const captured = results[0].status === "fulfilled";
  const sent = results[1].status === "fulfilled" && !results[1].value?.skipped;
  if (!captured && !sent) {
    results.forEach((r) => r.status === "rejected" && console.error("subscribe step failed:", r.reason));
    return json({ ok: false, error: "could not subscribe" }, 502);
  }
  results.forEach((r) => r.status === "rejected" && console.error("subscribe step (non-fatal):", r.reason));
  return json({ ok: true, message: "subscribed" }, 201);
}

async function handleContact(body, env) {
  const email = String(body.email || "").trim();
  const name = clean(body.name);
  if (!name || !validEmail(email)) {
    return json({ ok: false, error: "name and a valid email are required" }, 400);
  }
  const company = clean(body.company);
  const region = clean(body.region);
  const interest = clean(body.interest);
  const message = clean(body.message);

  // Store the lead in MailerLite, send the prospect an instant confirmation, and
  // alert the team — both emails via MailerSend (full HTML control, no reliance
  // on MailerLite automations).
  const cb = leadConfirmEmail(name);
  const results = await Promise.allSettled([
    mlUpsert(env, email, { name, company, region, interest, message }, env.ML_GROUP_LEADS),
    // Confirmation to the prospect.
    msSend(env, { to: { email, name }, subject: cb.subject, html: cb.html, text: cb.text }),
    // Instant internal alert so you follow up fast (speed-to-lead).
    msSend(env, {
      to: { email: env.NOTIFY_EMAIL || env.FROM_EMAIL, name: "CausQ" },
      reply_to: { email, name },
      subject: `New briefing request: ${name}${company ? ` (${company})` : ""}`,
      text:
        `New briefing request from causq.com\n` +
        `------------------------------------\n` +
        `Name:     ${name}\n` +
        `Email:    ${email}\n` +
        `Company:  ${company || "-"}\n` +
        `Region:   ${region || "-"}\n` +
        `Interest: ${interest || "-"}\n\n` +
        `Message:\n${message || "(none)"}\n`,
    }),
  ]);

  // results[0] = MailerLite capture, [1] = confirmation to lead, [2] = team alert.
  // The lead is "safe" if captured in MailerLite OR any real email send succeeded.
  // A *skipped* send (MailerSend not configured) does not count as delivery.
  const captured = results[0].status === "fulfilled";
  const realSend = results.slice(1).some((r) => r.status === "fulfilled" && !r.value?.skipped);
  if (!captured && !realSend) {
    results.forEach((r) => r.status === "rejected" && console.error("contact step failed:", r.reason));
    return json({ ok: false, error: "could not deliver request" }, 502);
  }
  results.forEach((r) => r.status === "rejected" && console.error("contact step (non-fatal):", r.reason));
  return json({ ok: true, message: "received" }, 201);
}

async function handleApply(body, env) {
  const email = String(body.email || "").trim();
  const name = clean(body.name);
  if (!name || !validEmail(email)) {
    return json({ ok: false, error: "name and a valid email are required" }, 400);
  }
  const role = clean(body.role);
  const region = clean(body.region);
  const link = clean(body.link);
  const message = clean(body.message);

  // Store the applicant in MailerLite (its own Careers group if configured, so it
  // never triggers the Brief or Leads automations), confirm receipt to the
  // applicant, and alert the team with the application details. Emails via
  // MailerSend (full HTML control, no reliance on MailerLite automations).
  const cb = applyConfirmEmail(name, role);
  const results = await Promise.allSettled([
    mlUpsert(env, email, { name, role, region, link, message }, env.ML_GROUP_CAREERS),
    // Confirmation to the applicant.
    msSend(env, { to: { email, name }, subject: cb.subject, html: cb.html, text: cb.text }),
    // Internal alert with the full application so the team can follow up.
    msSend(env, {
      to: { email: env.NOTIFY_EMAIL || env.FROM_EMAIL, name: "CausQ" },
      reply_to: { email, name },
      subject: `New application: ${name}${role ? ` — ${role}` : ""}`,
      text:
        `New careers application from causq.com\n` +
        `--------------------------------------\n` +
        `Name:     ${name}\n` +
        `Email:    ${email}\n` +
        `Role:     ${role || "-"}\n` +
        `Work pref:${region ? ` ${region}` : " -"}\n` +
        `Link:     ${link || "-"}\n\n` +
        `What they'd love to work on:\n${message || "(none)"}\n`,
    }),
  ]);

  // results[0] = MailerLite capture, [1] = confirmation to applicant, [2] = team alert.
  // The application is "safe" if captured in MailerLite OR any real email send succeeded.
  // A *skipped* send (MailerSend not configured) does not count as delivery.
  const captured = results[0].status === "fulfilled";
  const realSend = results.slice(1).some((r) => r.status === "fulfilled" && !r.value?.skipped);
  if (!captured && !realSend) {
    results.forEach((r) => r.status === "rejected" && console.error("apply step failed:", r.reason));
    return json({ ok: false, error: "could not deliver application" }, 502);
  }
  results.forEach((r) => r.status === "rejected" && console.error("apply step (non-fatal):", r.reason));
  return json({ ok: true, message: "received" }, 201);
}

/* ----------------------------------------------------------------- Turnstile */
// Returns true if the request passes the bot check. If TURNSTILE_SECRET is not
// configured, verification is skipped (returns true) so forms keep working until
// you turn it on. Once the secret is set, a missing/invalid token is rejected.
async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // not configured yet
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({ success: false }));
  return data.success === true;
}

/* ----------------------------------------------------------------- MailerLite */
// Upsert a subscriber and assign a group. Assigning the group is what triggers
// the group's automation in MailerLite.
async function mlUpsert(env, email, fields, groupId) {
  if (!env.MAILERLITE_API_KEY) throw new Error("MAILERLITE_API_KEY not set");
  const payload = { email, fields: compact(fields) };
  if (groupId) payload.groups = [String(groupId)];

  const res = await fetch(`${ML_API}/subscribers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MAILERLITE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`MailerLite ${res.status}: ${t.slice(0, 300)}`);
  }
  return res.json();
}

/* ----------------------------------------------------------------- MailerSend */
async function msSend(env, { to, subject, text, html, reply_to }) {
  if (!env.MAILERSEND_API_KEY) {
    // Email sending not configured yet — skip cleanly rather than fail the lead.
    console.warn(`MailerSend not configured — skipped '${subject}' to ${to.email}`);
    return { skipped: true };
  }
  const payload = {
    from: { email: env.FROM_EMAIL || "hello@causq.com", name: env.FROM_NAME || "CausQ" },
    to: [to],
    subject,
    text,
  };
  if (html) payload.html = html;
  if (reply_to) payload.reply_to = reply_to;

  const res = await fetch(`${MS_API}/email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MAILERSEND_API_KEY}`,
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
  });
  // MailerSend returns 202 Accepted on success.
  if (res.status !== 202 && !res.ok) {
    const t = await res.text();
    throw new Error(`MailerSend ${res.status}: ${t.slice(0, 300)}`);
  }
  return { ok: true };
}

/* ----------------------------------------------------------------- email bodies */
function shell(inner) {
  return (
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;` +
    `font-size:15px;line-height:1.6;color:#1a1a1f;max-width:560px;margin:0 auto">${inner}` +
    `<p style="color:#8a8a94;font-size:13px;margin-top:28px">CausQ &middot; ` +
    `<a href="https://causq.com" style="color:#0891b2">causq.com</a></p></div>`
  );
}
const firstName = (name) => (name ? String(name).split(/\s+/)[0] : "");

// Welcome email (Email 1 of "The Brief"), with the featured article link.
function welcomeEmail(name) {
  const fn = firstName(name);
  const hi = fn ? `Hi ${esc(fn)},` : "Welcome to The Brief,";
  const html = shell(
    `<p>${hi}</p>` +
    `<p>You're in. You'll get one considered email a month on the three forces reshaping the ` +
    `enterprise: AI, the networks it runs on, and security in the quantum era. Written by the ` +
    `engineers doing the work, not the marketing team.</p>` +
    `<p>Start here, the piece our readers forward most:</p>` +
    `<div style="margin:22px 0;padding:18px 20px;background:#f3fbfc;border-left:3px solid #06B6D4;border-radius:6px">` +
    `<strong style="font-size:16px">Harvest now, decrypt later: the breach you won't see for a decade.</strong><br>` +
    `<span style="color:#52525b">Adversaries are already storing your encrypted data to crack once quantum ` +
    `computers mature. Here's a pragmatic plan to become crypto-agile before the deadline finds you.</span><br>` +
    `<a href="https://causq.com/article-harvest-now-decrypt-later.html" ` +
    `style="display:inline-block;margin-top:12px;color:#0891b2;font-weight:700;text-decoration:none">Read the essay &rarr;</a>` +
    `</div>` +
    `<p>No noise, and you can unsubscribe anytime by replying to this email. Glad you're here.</p>` +
    `<p style="color:#71717a">- The CausQ team</p>`
  );
  const text =
    `${fn ? `Hi ${fn},` : "Welcome to The Brief,"}\n\n` +
    `You're in. You'll get one considered email a month on AI, the networks it runs on, and ` +
    `security in the quantum era. Written by the engineers doing the work.\n\n` +
    `Start here, the piece our readers forward most:\n` +
    `"Harvest now, decrypt later: the breach you won't see for a decade."\n` +
    `https://causq.com/article-harvest-now-decrypt-later.html\n\n` +
    `No noise, and you can unsubscribe anytime by replying to this email.\n\n` +
    `- The CausQ team\nhttps://causq.com\n`;
  return { subject: "Welcome to The Brief: start here", html, text };
}

// Instant confirmation to someone who submitted the briefing form.
function leadConfirmEmail(name) {
  const fn = firstName(name) || "there";
  const html = shell(
    `<p>Hi ${esc(fn)},</p>` +
    `<p>Thanks for reaching out to CausQ. We've got your briefing request and a senior engineer ` +
    `will be in touch within one business day to set it up.</p>` +
    `<p>If anything's urgent, just reply to this email and it'll reach us directly.</p>` +
    `<p style="color:#71717a">- The CausQ team</p>`
  );
  const text =
    `Hi ${fn},\n\n` +
    `Thanks for reaching out to CausQ. We've got your briefing request and a senior engineer ` +
    `will be in touch within one business day to set it up.\n\n` +
    `If anything's urgent, just reply to this email and it'll reach us directly.\n\n` +
    `- The CausQ team\nhttps://causq.com\n`;
  return { subject: "We've got your request", html, text };
}

// Instant confirmation to someone who submitted a careers application.
function applyConfirmEmail(name, role) {
  const fn = firstName(name) || "there";
  const forRole = role ? ` for the <strong>${esc(role)}</strong> role` : "";
  const forRoleTxt = role ? ` for the ${role} role` : "";
  const html = shell(
    `<p>Hi ${esc(fn)},</p>` +
    `<p>Thanks for applying to CausQ${forRole}. Your application has reached us, and the team ` +
    `will review it and get back to you if there's a fit.</p>` +
    `<p>We're engineer-led and read every application properly, so it may take a few days. If you ` +
    `want to add anything, just reply to this email and it'll reach us directly.</p>` +
    `<p style="color:#71717a">- The CausQ team</p>`
  );
  const text =
    `Hi ${fn},\n\n` +
    `Thanks for applying to CausQ${forRoleTxt}. Your application has reached us, and the team ` +
    `will review it and get back to you if there's a fit.\n\n` +
    `We read every application properly, so it may take a few days. If you want to add ` +
    `anything, just reply to this email and it'll reach us directly.\n\n` +
    `- The CausQ team\nhttps://causq.com\n`;
  return { subject: "We've got your application", html, text };
}

/* ----------------------------------------------------------------- helpers */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function clean(v) {
  const s = (v == null ? "" : String(v)).trim();
  return s.length ? s : undefined;
}
function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== "") out[k] = v;
  return out;
}
function validEmail(e) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}
function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}
function json(obj, status = 200) {
  return cors(
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}
