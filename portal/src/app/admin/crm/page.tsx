import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addOpportunity, setOpportunityStage, deleteOpportunity } from "./crm-actions";

const STAGES = ["lead", "qualified", "proposal", "won", "lost"] as const;

export default async function AdminCrm() {
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("orgs").select("id, name").order("name");
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, org_id, title, stage, value, currency, expected_close, orgs(name)")
    .order("created_at", { ascending: false });

  const list = opportunities ?? [];
  const orgName = (o: (typeof list)[number]) => {
    const org = o.orgs as { name: string } | { name: string }[] | null;
    return Array.isArray(org) ? org[0]?.name : org?.name;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <Link href="/admin/crm/contacts" className="text-sm text-neutral-500 hover:text-neutral-800">
          Contacts &rarr;
        </Link>
      </div>

      <form action={addOpportunity} className="flex flex-wrap items-end gap-2 rounded border p-3">
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
          <Input name="title" placeholder="SASE rollout, phase 2" required />
        </div>
        <div className="w-32">
          <label className="block text-xs text-neutral-500">Value (USD)</label>
          <Input name="value" type="number" step="0.01" placeholder="50000" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500">Expected close</label>
          <Input name="expected_close" type="date" />
        </div>
        <Button type="submit">Add opportunity</Button>
      </form>

      <div className="grid gap-3 md:grid-cols-5">
        {STAGES.map((stage) => {
          const items = list.filter((o) => o.stage === stage);
          const sum = items.reduce((s, o) => s + Number(o.value), 0);
          return (
            <section key={stage} className="rounded border bg-neutral-50/60 p-2">
              <div className="flex items-center justify-between px-1 py-1">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-neutral-600">{stage}</span>
                <span className="text-[0.65rem] text-neutral-400">{items.length}</span>
              </div>
              <div className="px-1 pb-2 text-[0.65rem] text-neutral-500">USD {sum.toLocaleString()}</div>
              <div className="space-y-2">
                {items.map((o) => (
                  <div key={o.id} className="rounded border bg-white p-2 text-sm shadow-sm">
                    <Link href={`/admin/crm/${o.org_id}`} className="block font-medium hover:underline">
                      {o.title}
                    </Link>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {orgName(o)} · {o.currency} {Number(o.value).toLocaleString()}
                    </div>
                    {o.expected_close && (
                      <div className="text-[0.65rem] text-neutral-400">close {o.expected_close}</div>
                    )}
                    <div className="mt-2 flex items-center gap-1">
                      <form action={setOpportunityStage} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="org_id" value={o.org_id} />
                        <input type="hidden" name="title" value={o.title} />
                        <select name="stage" defaultValue={o.stage} className="rounded border p-1 text-[0.65rem]">
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button className="rounded border px-1.5 py-0.5 text-[0.65rem] text-neutral-600 hover:border-neutral-400">
                          Move
                        </button>
                      </form>
                      <form action={deleteOpportunity} className="ml-auto">
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="org_id" value={o.org_id} />
                        <button className="text-[0.65rem] text-red-600 hover:underline">×</button>
                      </form>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="px-1 py-2 text-[0.65rem] text-neutral-400">empty</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
