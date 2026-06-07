# CausQ Client Portal — Fast-Follow: Stripe Pay-Now Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** A client can pay an unpaid invoice online; on payment the invoice flips to `paid`. Fully wired and locally testable; live charging needs Stripe keys.

**Architecture:** A "Pay now" button creates a Stripe Checkout Session (server action, env-guarded) carrying `invoice_id` in metadata. Stripe redirects back; a webhook (`/api/stripe/webhook`) verifies the signature and marks the invoice paid via the service-role client. Without `STRIPE_SECRET_KEY`, the action returns a friendly "not configured" message so the rest of the portal is unaffected.

**Tech Stack:** Next.js 16, Stripe Node SDK, Supabase.

**Builds on:** Plans 01-05 (`feat/client-portal`).

---

## File Structure

```
portal/supabase/migrations/20260607170000_invoice_payments.sql   add stripe_session_id, paid_at
portal/src/lib/stripe.ts                                         lazy, env-guarded Stripe client + markInvoicePaid
portal/src/app/portal/invoices/pay-actions.ts                    createCheckout server action
portal/src/app/portal/invoices/PayButton.tsx                     client "Pay now"
portal/src/app/portal/invoices/page.tsx                          (modify) render PayButton for unpaid invoices
portal/src/app/api/stripe/webhook/route.ts                       signed webhook -> mark paid
portal/.env.example                                              (modify) Stripe keys
```

---

## Task 1: Invoice payment columns (migration)

**Files:** Create `portal/supabase/migrations/20260607170000_invoice_payments.sql`

- [ ] **Step 1:**

```sql
alter table public.invoices add column if not exists stripe_session_id text;
alter table public.invoices add column if not exists paid_at timestamptz;
```

- [ ] **Step 2:** `npx supabase db reset`. Expected: clean.
- [ ] **Step 3:** Commit: `feat(portal): invoice payment columns (stripe_session_id, paid_at)`.

---

## Task 2: Stripe helper

**Files:** Create `portal/src/lib/stripe.ts`

- [ ] **Step 1:**

```ts
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
    .update({ status: "paid", paid_at: new Date().toISOString(), stripe_session_id: sessionId ?? null })
    .eq("id", invoiceId);
}
```

- [ ] **Step 2:** `npm install stripe`.
- [ ] **Step 3:** Commit: `feat(portal): Stripe helper + markInvoicePaid`.

---

## Task 3: Checkout server action

**Files:** Create `portal/src/app/portal/invoices/pay-actions.ts`

- [ ] **Step 1:**

```ts
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
```

- [ ] **Step 2:** Commit: `feat(portal): Stripe checkout server action`.

---

## Task 4: Pay button + invoices page wiring

**Files:** Create `portal/src/app/portal/invoices/PayButton.tsx`; modify `invoices/page.tsx`.

- [ ] **Step 1:** `PayButton.tsx`:

```tsx
"use client";
import { useState } from "react";
import { createCheckout } from "./pay-actions";
import { Button } from "@/components/ui/button";

export function PayButton({ invoiceId }: { invoiceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await createCheckout(invoiceId);
          setBusy(false);
          if (r?.error) setError(r.error);
          else if (r?.url) window.location.href = r.url;
        }}
      >
        {busy ? "…" : "Pay now"}
      </Button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </>
  );
}
```

- [ ] **Step 2:** In `invoices/page.tsx`, import `PayButton` and render it next to the download for unpaid invoices:

```tsx
{inv.status !== "paid" && Number(inv.amount) > 0 && <PayButton invoiceId={inv.id} />}
```

(placed inside the right-hand action group.)

- [ ] **Step 3:** `npm run build`. Commit: `feat(portal): Pay now button on invoices`.

---

## Task 5: Stripe webhook

**Files:** Create `portal/src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1:**

```ts
import { NextResponse } from "next/server";
import { getStripe, markInvoicePaid } from "@/lib/stripe";

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
    const session = event.data.object as { id: string; metadata?: { invoice_id?: string } };
    const invoiceId = session.metadata?.invoice_id;
    if (invoiceId) await markInvoicePaid(invoiceId, session.id);
  }
  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2:** Add to `.env.example`: `STRIPE_SECRET_KEY=` and `STRIPE_WEBHOOK_SECRET=`.
- [ ] **Step 3:** `npm run build`. Commit: `feat(portal): Stripe webhook marks invoices paid`.

---

## Task 6: Verification

- [ ] **Step 1:** `npm run build` passes; `npx supabase test db` still 30/30.
- [ ] **Step 2:** Without Stripe keys, confirm `createCheckout` returns the "not configured" message (the Pay-now button shows it) and the webhook returns 503 — i.e., the portal is unaffected.
- [ ] **Step 3:** Simulate the DB side: call `markInvoicePaid` against a seeded unpaid invoice via a one-off node script and confirm it flips to `paid` with `paid_at` set.
- [ ] **Step 4:** Push to update PR #1.

---

## Self-Review (completed during authoring)
- **Spec coverage:** pay-now Checkout (Tasks 3-4), payment confirmation via webhook (Task 5), invoice state transition (Tasks 1-2, verified Task 6). Env-guarded so absent keys do not break the app.
- **Placeholder scan:** all code present.
- **Type/name consistency:** `markInvoicePaid(invoiceId, sessionId?)` and `createCheckout(invoiceId)` match across helper, action, button, and webhook; metadata key `invoice_id` consistent.

## Deferred (real Stripe verification, needs keys)
- End-to-end test-mode checkout + `stripe listen` webhook forwarding belongs in deploy (Plan 06) with real test keys.
