import { createClient } from "@/lib/supabase/server";
import { InviteCreator } from "./InviteCreator";
import { deleteInvite } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function AdminInvites({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("orgs").select("id, name").order("name");
  const { data: invites } = await supabase
    .from("invites")
    .select("id, email, org_id, expires_at, redeemed_by, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Invites</h1>
      <InviteCreator orgs={orgs ?? []} prefillEmail={email} />

      <ul className="space-y-2">
        {(invites ?? []).map((i) => (
          <li key={i.id} className="flex items-center justify-between rounded border p-3 text-sm">
            <div>
              <div className="font-medium">{i.email ?? "(any email)"}</div>
              <div className="text-neutral-500">
                expires {new Date(i.expires_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={i.redeemed_by ? "text-neutral-400" : "text-brand-deep"}>
                {i.redeemed_by ? "redeemed" : "open"}
              </span>
              <form action={deleteInvite}>
                <input type="hidden" name="id" value={i.id} />
                <ConfirmButton
                  message={i.redeemed_by ? "Delete this redeemed invite record?" : "Revoke this open invite?"}
                  className="text-xs text-red-600 hover:underline"
                >
                  {i.redeemed_by ? "Delete" : "Revoke"}
                </ConfirmButton>
              </form>
            </div>
          </li>
        ))}
        {(!invites || invites.length === 0) && (
          <li className="text-sm text-neutral-500">No invites yet.</li>
        )}
      </ul>
    </div>
  );
}
