import { createClient } from "@/lib/supabase/server";
import { approveUser, rejectUser } from "./actions";
import { Button } from "@/components/ui/button";

export default async function AdminOverview() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("profiles")
    .select("id, email, name, org_id, status")
    .eq("status", "pending")
    .order("created_at");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pending approvals</h1>
      <ul className="space-y-2">
        {(pending ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded border p-3">
            <div className="text-sm">
              <div className="font-medium">{p.name ?? p.email}</div>
              <div className="text-neutral-500">
                {p.email} · org {p.org_id ?? "unmatched"}
              </div>
            </div>
            <div className="flex gap-2">
              <form action={approveUser}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="org_id" value={p.org_id ?? ""} />
                <Button size="sm" type="submit">
                  Approve
                </Button>
              </form>
              <form action={rejectUser}>
                <input type="hidden" name="id" value={p.id} />
                <Button size="sm" variant="outline" type="submit">
                  Reject
                </Button>
              </form>
            </div>
          </li>
        ))}
        {(!pending || pending.length === 0) && (
          <li className="text-sm text-neutral-500">Nothing pending.</li>
        )}
      </ul>
    </div>
  );
}
