import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { InvoiceDownload } from "./InvoiceDownload";
import { PayButton } from "./PayButton";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, number, amount, currency, status, due_date, pdf_path")
    .order("created_at", { ascending: false });

  const list = invoices ?? [];

  return (
    <PortalShell active="invoices">
      <div className="reveal">
        <p className="kicker">Billing</p>
        <h1 className="mt-3 text-3xl font-semibold">Invoices</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-mute)]">
          Your invoices, their status, and downloads. Pay online where enabled.
        </p>
      </div>

      <div className="reveal panel mt-8 divide-y divide-[var(--line)]" style={{ animationDelay: "0.05s" }}>
        {list.map((inv) => (
          <div key={inv.id} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-sm font-medium">{inv.number}</div>
              <div className="meta mt-0.5">
                {inv.currency} {Number(inv.amount).toLocaleString()} &middot; due{" "}
                {inv.due_date ?? "n/a"}
              </div>
            </div>
            <span className={`pill pill-${inv.status}`}>{inv.status}</span>
            <div className="flex items-center gap-2">
              {inv.pdf_path && <InvoiceDownload path={inv.pdf_path} />}
              {inv.status !== "paid" && Number(inv.amount) > 0 && (
                <PayButton invoiceId={inv.id} />
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="p-8 text-center">
            <p className="kicker justify-center">No invoices yet</p>
            <p className="mt-3 text-sm text-[var(--ink-mute)]">
              Invoices will appear here once issued.
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
