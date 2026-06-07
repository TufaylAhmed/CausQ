"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function createCheckout(invoiceId: string) {
  const stripe = getStripe();
  if (!stripe) return { error: "Online payment is not configured yet." };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, number, amount, currency, status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === "paid") return { error: "Invoice already paid." };

  const origin = (await headers()).get("origin") ?? "http://127.0.0.1:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: (invoice.currency ?? "usd").toLowerCase(),
          unit_amount: Math.round(Number(invoice.amount) * 100),
          product_data: { name: `Invoice ${invoice.number}` },
        },
      },
    ],
    metadata: { invoice_id: invoice.id },
    success_url: `${origin}/portal/invoices?paid=1`,
    cancel_url: `${origin}/portal/invoices`,
  });
  return { url: session.url ?? undefined };
}
