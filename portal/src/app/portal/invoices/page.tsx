import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <a href="/portal" className="text-sm text-brand-deep underline">
        ← Back
      </a>
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <ul className="space-y-2">
        {(invoices ?? []).map((inv) => (
          <li
            key={inv.id}
            className="flex items-center justify-between rounded border p-3"
          >
            <div>
              <div className="font-medium">{inv.number}</div>
              <div className="text-sm text-neutral-500">
                {inv.currency} {Number(inv.amount).toLocaleString()} · due{" "}
                {inv.due_date ?? "n/a"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={inv.status === "paid" ? "default" : "secondary"}>
                {inv.status}
              </Badge>
              {inv.pdf_path && <InvoiceDownload path={inv.pdf_path} />}
              {inv.status !== "paid" && Number(inv.amount) > 0 && (
                <PayButton invoiceId={inv.id} />
              )}
            </div>
          </li>
        ))}
        {(!invoices || invoices.length === 0) && (
          <li className="text-sm text-neutral-500">No invoices yet.</li>
        )}
      </ul>
    </div>
  );
}
