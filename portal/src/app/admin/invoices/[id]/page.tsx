import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { uploadInvoicePdf, addLineItem, deleteLineItem, updateInvoiceStatus, deleteInvoice } from "../invoice-actions";
import { ConfirmButton } from "@/components/ConfirmButton";

const STATUSES = ["draft", "sent", "overdue", "paid"] as const;

export default async function AdminInvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, number, amount, currency, status, due_date, pdf_path, paid_at, orgs(name)")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) notFound();

  const org = invoice.orgs as { name: string } | { name: string }[] | null;
  const orgName = Array.isArray(org) ? org[0]?.name : org?.name;

  const { data: items } = await supabase
    .from("invoice_line_items")
    .select("id, description, quantity, unit_amount")
    .eq("invoice_id", id)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  const lineItems = items ?? [];
  const ccy = invoice.currency;

  return (
    <div className="space-y-6">
      <Link href="/admin/invoices" className="text-sm text-neutral-500 hover:text-neutral-800">
        &larr; All invoices
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{invoice.number}</h1>
          <p className="text-sm text-neutral-500">
            {orgName ?? "n/a"} · {ccy} {Number(invoice.amount).toLocaleString()} · due {invoice.due_date ?? "n/a"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>{invoice.status}</Badge>
          {invoice.status !== "paid" && (
            <form action={deleteInvoice}>
              <input type="hidden" name="invoice_id" value={invoice.id} />
              <ConfirmButton
                message={`Delete invoice ${invoice.number}? This removes it and its line items.`}
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>

      {/* Status */}
      <form action={updateInvoiceStatus} className="flex flex-wrap items-end gap-2 rounded border p-3">
        <input type="hidden" name="invoice_id" value={invoice.id} />
        <div>
          <label className="block text-xs text-neutral-500">Status</label>
          <select name="status" defaultValue={invoice.status} className="rounded border p-2 text-sm">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Update status</Button>
        <p className="ml-auto self-center text-xs text-neutral-400">
          Marking &quot;sent&quot; or &quot;overdue&quot; notifies the client.
        </p>
      </form>

      {/* PDF */}
      <form action={uploadInvoicePdf} className="flex flex-wrap items-end gap-2 rounded border p-3">
        <input type="hidden" name="invoice_id" value={invoice.id} />
        <div>
          <label className="block text-xs text-neutral-500">Invoice PDF</label>
          <input name="file" type="file" accept="application/pdf" required className="text-sm" />
        </div>
        <Button type="submit">{invoice.pdf_path ? "Replace PDF" : "Upload PDF"}</Button>
        {invoice.pdf_path && <span className="self-center text-xs text-green-700">PDF attached</span>}
      </form>

      {/* Line items */}
      <div className="rounded border">
        <div className="border-b px-3 py-2 text-sm font-medium">Line items</div>
        <ul className="divide-y">
          {lineItems.map((li) => (
            <li key={li.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{li.description}</span>
              <span className="tabular-nums text-neutral-500">
                {Number(li.quantity)} × {ccy} {Number(li.unit_amount).toLocaleString()}
              </span>
              <span className="w-28 text-right tabular-nums font-medium">
                {ccy} {(Number(li.quantity) * Number(li.unit_amount)).toLocaleString()}
              </span>
              <form action={deleteLineItem}>
                <input type="hidden" name="id" value={li.id} />
                <input type="hidden" name="invoice_id" value={invoice.id} />
                <button className="text-xs text-red-600 hover:underline">Remove</button>
              </form>
            </li>
          ))}
          {lineItems.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-500">No line items yet.</li>
          )}
        </ul>
        <form action={addLineItem} className="flex flex-wrap items-end gap-2 border-t p-3">
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <div className="min-w-[12rem] flex-1">
            <label className="block text-xs text-neutral-500">Description</label>
            <Input name="description" placeholder="Advisory, sprint 4" required />
          </div>
          <div className="w-20">
            <label className="block text-xs text-neutral-500">Qty</label>
            <Input name="quantity" type="number" step="0.01" defaultValue="1" />
          </div>
          <div className="w-28">
            <label className="block text-xs text-neutral-500">Unit ({ccy})</label>
            <Input name="unit_amount" type="number" step="0.01" placeholder="0.00" />
          </div>
          <Button type="submit">Add line</Button>
        </form>
      </div>
    </div>
  );
}
