import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notify";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

// Marks an invoice paid. Used by the webhook (service role bypasses RLS).
export async function markInvoicePaid(invoiceId: string, sessionId?: string) {
  const admin = createAdminClient();
  return admin
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_session_id: sessionId ?? null,
    })
    .eq("id", invoiceId);
}

// Emails a payment receipt to the org's active clients. Best-effort: sendEmail
// is a no-op when MailerSend is unconfigured. Service role bypasses RLS.
export async function sendPaymentReceipt(invoiceId: string) {
  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("invoices")
    .select("number, amount, currency, org_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return;

  const { data: recipients } = await admin
    .from("profiles")
    .select("email")
    .eq("org_id", invoice.org_id)
    .eq("status", "active")
    .eq("role", "client");

  const amount = `${invoice.currency} ${Number(invoice.amount).toLocaleString()}`;
  const subject = `Payment received for invoice ${invoice.number}`;
  const text =
    `Thank you. We have received your payment of ${amount} for invoice ${invoice.number}.\n\n` +
    `Your invoice and receipt are in the CausQ portal: https://portal.causq.com/portal/invoices\n\n` +
    `CausQ`;

  for (const r of recipients ?? []) {
    if (r.email) await sendEmail({ to: r.email, subject, text });
  }
}
