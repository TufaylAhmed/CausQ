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

   Secrets (wrangler secret put ...):
     MAILERLITE_API_KEY   MailerLite API token
     MAILERSEND_API_KEY   MailerSend API token  (optional — emails skipped if unset)

   Vars (wrangler.toml [vars]):
     ML_GROUP_BRIEF   MailerLite group id for "The Brief"
     ML_GROUP_LEADS   MailerLite group id for "Leads — Briefing Requests"
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

  await mlUpsert(env, email, { name }, env.ML_GROUP_BRIEF);
  // MailerLite's welcome automation (triggered by joining the Brief group) sends
  // the actual welcome email, so nothing more to do here.
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

  // Record the lead in MailerLite (Leads group). Joining that group triggers the
  // "Briefing Request — Instant Confirmation" automation, which sends the lead
  // their confirmation email — so the Worker does NOT send a confirmation itself.
  // The only thing left for the Worker is the internal team alert (optional: it
  // needs MailerSend; if MAILERSEND_API_KEY is unset it's skipped and the lead is
  // still captured + confirmed by MailerLite).
  const results = await Promise.allSettled([
    mlUpsert(env, email, { name, company, region, interest, message }, env.ML_GROUP_LEADS),
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

  // results[0] = MailerLite capture (also triggers the lead's confirmation email),
  // results[1] = team alert. The lead is "safe" if it was captured in MailerLite,
  // OR (failing that) the team was alerted by a real send. A *skipped* alert
  // (MailerSend not configured) does not count as delivery.
  const captured = results[0].status === "fulfilled";
  const alerted = results[1].status === "fulfilled" && !results[1].value?.skipped;
  if (!captured && !alerted) {
    results.forEach((r) => r.status === "rejected" && console.error("contact step failed:", r.reason));
    return json({ ok: false, error: "could not deliver request" }, 502);
  }
  results.forEach((r) => r.status === "rejected" && console.error("contact step (non-fatal):", r.reason));
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
async function msSend(env, { to, subject, text, reply_to }) {
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

/* ----------------------------------------------------------------- helpers */
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
