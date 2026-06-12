import { createClient } from "@/lib/supabase/server";
import { deleteAccessRequest } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function AdminRequests() {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("access_requests")
    .select("id, name, email, company, message, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Access requests</h1>
      <ul className="space-y-2">
        {(requests ?? []).map((r) => (
          <li key={r.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">
                  {r.name} · {r.email}
                </div>
                <div className="text-neutral-500">{r.company ?? "No company"}</div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`/admin/invites?email=${encodeURIComponent(r.email)}`}
                  className="text-sm text-brand-deep underline"
                >
                  Create invite →
                </a>
                <form action={deleteAccessRequest}>
                  <input type="hidden" name="id" value={r.id} />
                  <ConfirmButton message="Dismiss this access request?" className="text-xs text-red-600 hover:underline">
                    Dismiss
                  </ConfirmButton>
                </form>
              </div>
            </div>
            {r.message && <p className="mt-2 text-sm text-neutral-700">{r.message}</p>}
          </li>
        ))}
        {(!requests || requests.length === 0) && (
          <li className="text-sm text-neutral-500">No requests.</li>
        )}
      </ul>
    </div>
  );
}
