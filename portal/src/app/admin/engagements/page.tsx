import { createClient } from "@/lib/supabase/server";
import { createEngagement, addMilestone, setEngagementStatus, deleteEngagement } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ConfirmButton";

const STATUSES = ["active", "on_hold", "closed"] as const;

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
        <div>
          <label className="block text-xs text-neutral-500">Template</label>
          <select name="template" className="rounded border p-2 text-sm">
            <option value="">No milestones</option>
            <option value="assessment">Assessment</option>
            <option value="implementation">Implementation</option>
            <option value="managed">Managed service</option>
          </select>
        </div>
        <Button type="submit">Create</Button>
      </form>

      <ul className="space-y-2">
        {(engagements ?? []).map((e) => {
          const org = e.orgs as { name: string } | { name: string }[] | null;
          const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
          return (
            <li key={e.id} className="rounded border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="text-sm text-neutral-500">
                    {orgName ?? "n/a"} · {e.status} · {e.progress}%
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <form action={setEngagementStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={e.id} />
                    <select name="status" defaultValue={e.status} className="rounded border p-1 text-xs">
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button className="rounded border px-1.5 py-0.5 text-xs text-neutral-600 hover:border-neutral-400">
                      Set
                    </button>
                  </form>
                  <form action={deleteEngagement}>
                    <input type="hidden" name="id" value={e.id} />
                    <ConfirmButton
                      message={`Delete "${e.title}"? This permanently removes its milestones, tasks, and messages.`}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
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
