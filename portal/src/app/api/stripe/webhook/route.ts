import { NextResponse } from "next/server";
import { getStripe, markInvoicePaid, sendPaymentReceipt } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      metadata?: { invoice_id?: string };
    };
    const invoiceId = session.metadata?.invoice_id;
    if (invoiceId) {
      await markInvoicePaid(invoiceId, session.id);
      await sendPaymentReceipt(invoiceId);
    }
  }
  return NextResponse.json({ received: true });
}
