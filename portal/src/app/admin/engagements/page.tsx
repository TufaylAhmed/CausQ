import { createClient } from "@/lib/supabase/server";
import { createEngagement, addMilestone } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function AdminEngagements() {
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("orgs").select("id, name").order("name");
  const { data: engagements } = await supabase
    .from("engagements")
    .select("id, title, status, progress, orgs(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Engagements</h1>

      <form action={createEngagement} className="flex flex-wrap items-end gap-2 rounded border p-3">
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
        <div className="flex-1">
          <label className="block text-xs text-neutral-500">Title</label>
          <Input name="title" placeholder="Quantum readiness assessment" required />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-neutral-500">Summary</label>
          <Input name="summary" placeholder="Short summary" />
        </div>
        <Button type="submit">Create</Button>
      </form>

      <ul className="space-y-2">
        {(engagements ?? []).map((e) => {
          const org = e.orgs as { name: string } | { name: string }[] | null;
          const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
          return (
            <li key={e.id} className="rounded border p-3">
              <div className="font-medium">{e.title}</div>
              <div className="text-sm text-neutral-500">
                {orgName ?? "n/a"} · {e.status} · {e.progress}%
              </div>
              <form action={addMilestone} className="mt-2 flex items-end gap-2">
                <input type="hidden" name="engagement_id" value={e.id} />
                <div className="flex-1">
                  <label className="block text-xs text-neutral-500">Add milestone</label>
                  <Input name="title" placeholder="Milestone title" />
                </div>
                <Button size="sm" variant="outline" type="submit">
                  Add
                </Button>
              </form>
            </li>
          );
        })}
        {(!engagements || engagements.length === 0) && (
          <li className="text-sm text-neutral-500">No engagements yet.</li>
        )}
      </ul>
    </div>
  );
}
