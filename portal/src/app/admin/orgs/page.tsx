import { createClient } from "@/lib/supabase/server";
import { createOrg, updateOrgDomains } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function AdminOrgs() {
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("orgs")
    .select("id, name, verified_domains")
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Organizations</h1>

      <form action={createOrg} className="flex flex-wrap items-end gap-2 rounded border p-3">
        <div>
          <label className="block text-xs text-neutral-500">Name</label>
          <Input name="name" placeholder="Acme Corp" required />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-neutral-500">Verified domains (comma-separated)</label>
          <Input name="domains" placeholder="acme.com, acme.io" />
        </div>
        <Button type="submit">Create org</Button>
      </form>

      <ul className="space-y-2">
        {(orgs ?? []).map((o) => (
          <li key={o.id} className="rounded border p-3">
            <div className="font-medium">{o.name}</div>
            <form action={updateOrgDomains} className="mt-2 flex items-end gap-2">
              <input type="hidden" name="id" value={o.id} />
              <div className="flex-1">
                <label className="block text-xs text-neutral-500">Verified domains</label>
                <Input name="domains" defaultValue={(o.verified_domains ?? []).join(", ")} />
              </div>
              <Button size="sm" variant="outline" type="submit">
                Save
              </Button>
            </form>
          </li>
        ))}
        {(!orgs || orgs.length === 0) && (
          <li className="text-sm text-neutral-500">No organizations yet.</li>
        )}
      </ul>
    </div>
  );
}
