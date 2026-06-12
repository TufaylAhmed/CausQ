import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addNote } from "../crm-actions";

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function CrmOrgDetail({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase.from("orgs").select("id, name").eq("id", orgId).maybeSingle();
  if (!org) notFound();

  const [{ data: opportunities }, { data: contacts }, { data: activity }] = await Promise.all([
    supabase.from("opportunities").select("id, title, stage, value, currency").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("contacts").select("id, name, role, email, is_causq_staff").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("activity_log").select("id, kind, summary, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <Link href="/admin/crm" className="text-sm text-neutral-500 hover:text-neutral-800">
          &larr; Pipeline
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Opportunities */}
          <section className="rounded border">
            <div className="border-b px-3 py-2 text-sm font-medium">Opportunities</div>
            <ul className="divide-y">
              {(opportunities ?? []).map((o) => (
                <li key={o.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{o.title}</span>
                  <span className="text-neutral-500">
                    {o.stage} · {o.currency} {Number(o.value).toLocaleString()}
                  </span>
                </li>
              ))}
              {(opportunities ?? []).length === 0 && (
                <li className="px-3 py-2 text-sm text-neutral-500">No opportunities.</li>
              )}
            </ul>
          </section>

          {/* Contacts */}
          <section className="rounded border">
            <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-medium">
              <span>Contacts</span>
              <Link href="/admin/crm/contacts" className="text-xs text-neutral-500 hover:text-neutral-800">
                Manage &rarr;
              </Link>
            </div>
            <ul className="divide-y">
              {(contacts ?? []).map((c) => (
                <li key={c.id} className="px-3 py-2 text-sm">
                  <span className="font-medium">{c.name}</span>
                  {c.is_causq_staff && <span className="ml-2 text-[0.65rem] uppercase text-[var(--signal-deep)]">CausQ</span>}
                  <div className="text-neutral-500">
                    {c.role ?? ""}
                    {c.email ? ` · ${c.email}` : ""}
                  </div>
                </li>
              ))}
              {(contacts ?? []).length === 0 && <li className="px-3 py-2 text-sm text-neutral-500">No contacts.</li>}
            </ul>
          </section>
        </div>

        {/* Activity timeline */}
        <section className="rounded border">
          <div className="border-b px-3 py-2 text-sm font-medium">Activity</div>
          <form action={addNote} className="flex items-end gap-2 border-b p-3">
            <input type="hidden" name="org_id" value={orgId} />
            <div className="flex-1">
              <label className="block text-xs text-neutral-500">Add a note</label>
              <Input name="summary" placeholder="Spoke with the buyer about timing" />
            </div>
            <Button size="sm" type="submit">
              Log
            </Button>
          </form>
          <ul className="divide-y">
            {(activity ?? []).map((a) => (
              <li key={a.id} className="px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.6rem] uppercase tracking-widest text-neutral-400">{a.kind}</span>
                  <span className="text-[0.65rem] text-neutral-400">{when(a.created_at)}</span>
                </div>
                <div className="mt-0.5">{a.summary}</div>
              </li>
            ))}
            {(activity ?? []).length === 0 && <li className="px-3 py-3 text-sm text-neutral-500">No activity yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
