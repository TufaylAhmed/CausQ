import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { InvoiceDownload } from "../InvoiceDownload";
import { PayButton } from "../PayButton";

function fmtDate(d: string | null): string {
  if (!d) return "n/a";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (profile?.status !== "active") redirect("/portal/pending");

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, number, amount, currency, status, due_date, pdf_path, paid_at, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) notFound();

  const { data: items } = await supabase
    .from("invoice_line_items")
    .select("id, description, quantity, unit_amount, sort")
    .eq("invoice_id", id)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  const lineItems = items ?? [];
  const ccy = invoice.currency;
  const money = (n: number) => `${ccy} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = invoice.status !== "paid" && !!invoice.due_date && invoice.due_date < today;

  type Step = { label: string; when: string; state: "done" | "pending" | "alert" };
  const steps: Step[] = [
    { label: "Issued", when: fmtDate(invoice.created_at), state: "done" },
    {
      label: isOverdue ? "Overdue" : "Due",
      when: fmtDate(invoice.due_date),
      state: isOverdue ? "alert" : invoice.status === "paid" ? "done" : "pending",
    },
    invoice.status === "paid"
      ? { label: "Paid", when: fmtDate(invoice.paid_at), state: "done" }
      : { label: "Awaiting payment", when: "", state: "pending" },
  ];

  return (
    <PortalShell active="invoices">
      <Link href="/portal/invoices" className="meta inline-flex items-center gap-1 hover:text-[var(--signal-deep)]">
        &larr; All invoices
      </Link>

      <div className="reveal mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">Invoice</p>
          <h1 className="mt-3 font-mono text-3xl font-semibold">{invoice.number}</h1>
          <p className="mt-2 text-sm text-[var(--ink-mute)]">
            {money(Number(invoice.amount))} &middot; due {fmtDate(invoice.due_date)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`pill pill-${isOverdue ? "overdue" : invoice.status}`}>
            {isOverdue ? "overdue" : invoice.status}
          </span>
          {invoice.pdf_path && <InvoiceDownload path={invoice.pdf_path} />}
          {invoice.status !== "paid" && Number(invoice.amount) > 0 && <PayButton invoiceId={invoice.id} />}
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* Line items */}
        <section className="panel reveal lg:col-span-2" style={{ animationDelay: "0.05s" }}>
          <div className="border-b border-[var(--line)] px-5 py-4">
            <p className="kicker">Line items</p>
          </div>
          {lineItems.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="meta px-5 py-2 font-normal">Description</th>
                  <th className="meta px-3 py-2 text-right font-normal">Qty</th>
                  <th className="meta px-3 py-2 text-right font-normal">Unit</th>
                  <th className="meta px-5 py-2 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => (
                  <tr key={li.id} className="border-t border-[var(--line)]">
                    <td className="px-5 py-3">{li.description}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{Number(li.quantity)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{money(Number(li.unit_amount))}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">
                      {money(Number(li.quantity) * Number(li.unit_amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--line-strong)]">
                  <td className="px-5 py-3" colSpan={3}>
                    <span className="meta">Total</span>
                  </td>
                  <td className="px-5 py-3 text-right text-base font-semibold tabular-nums">
                    {money(Number(invoice.amount))}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-[var(--ink-mute)]">
                This invoice is not itemized. The total due is{" "}
                <span className="font-medium text-[var(--ink)]">{money(Number(invoice.amount))}</span>.
              </p>
            </div>
          )}
        </section>

        {/* Status timeline */}
        <aside className="panel reveal h-fit" style={{ animationDelay: "0.1s" }}>
          <div className="border-b border-[var(--line)] px-5 py-4">
            <p className="kicker">Status</p>
          </div>
          <div className="tl p-5">
            {steps.map((s, i) => (
              <div key={i} className={`tl-step ${s.state === "done" ? "tl-done" : ""} ${s.state === "alert" ? "tl-alert" : ""}`}>
                <span className="tl-dot" />
                <div className="text-sm font-medium">{s.label}</div>
                {s.when && <div className="meta mt-0.5">{s.when}</div>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
