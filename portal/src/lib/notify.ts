import "server-only";

type Mail = { to: string; subject: string; text: string };

// Sends transactional email via MailerSend. No-op when MAILERSEND_API_KEY is unset
// (local dev), so callers can treat notification as best-effort.
export async function sendEmail({ to, subject, text }: Mail) {
  const key = process.env.MAILERSEND_API_KEY;
  const from = process.env.PORTAL_FROM_EMAIL ?? "hello@causq.com";
  if (!key) {
    console.log(`[notify:skipped no MAILERSEND_API_KEY] -> ${to}: ${subject}`);
    return { skipped: true };
  }
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: from, name: "CausQ" },
      to: [{ email: to }],
      subject,
      text,
    }),
  });
  return { ok: res.ok, status: res.status };
}
