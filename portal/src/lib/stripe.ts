import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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
