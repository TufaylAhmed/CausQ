import { createClient } from "@/lib/supabase/server";
import { createInvoice } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default async function AdminInvoices() {
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("orgs").select("id, name").order("name");
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, number, amount, currency, status, due_date, orgs(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Invoices</h1>

      <form action={createInvoice} className="flex flex-wrap items-end gap-2 rounded border p-3">
        <div>
          <label className="block text-xs text-neutral-500">Org</label>
          <select name="org_id" required className="rounded border p-2 text-sm">
            {(orgs ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-500">Number</label>
          <Input name="number" placeholder="INV-1052" required />
        </div>
        <div>
          <label className="block text-xs text-neutral-500">Amount</label>
          <Input name="amount" type="number" step="0.01" placeholder="12000" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500">Due date</label>
          <Input name="due_date" type="date" />
        </div>
        <Button type="submit">Record</Button>
      </form>

      <ul className="space-y-2">
        {(invoices ?? []).map((inv) => {
          const org = inv.orgs as { name: string } | { name: string }[] | null;
          const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
          return (
            <li key={inv.id} className="flex items-center justify-between rounded border p-3">
              <div className="text-sm">
                <a href={`/admin/invoices/${inv.id}`} className="font-medium hover:underline">
                  {inv.number}
                </a>
                <div className="text-neutral-500">
                  {orgName ?? "n/a"} · {inv.currency} {Number(inv.amount).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                <a href={`/admin/invoices/${inv.id}`} className="text-xs text-neutral-500 hover:text-neutral-800">
                  Manage &rarr;
                </a>
              </div>
            </li>
          );
        })}
        {(!invoices || invoices.length === 0) && (
          <li className="text-sm text-neutral-500">No invoices yet.</li>
        )}
      </ul>
    </div>
  );
}
