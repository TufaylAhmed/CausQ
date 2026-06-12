import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addContact, deleteContact } from "../crm-actions";

export default async function AdminCrmContacts() {
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("orgs").select("id, name").order("name");
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, org_id, name, email, role, is_causq_staff, orgs(name)")
    .order("created_at", { ascending: false });

  const list = contacts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Link href="/admin/crm" className="text-sm text-neutral-500 hover:text-neutral-800">
          &larr; Pipeline
        </Link>
      </div>

      <form action={addContact} className="flex flex-wrap items-end gap-2 rounded border p-3">
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
          <label className="block text-xs text-neutral-500">Name</label>
          <Input name="name" placeholder="Jordan Lee" required />
        </div>
        <div>
          <label className="block text-xs text-neutral-500">Email</label>
          <Input name="email" type="email" placeholder="jordan@…" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500">Role</label>
          <Input name="role" placeholder="Engagement lead" />
        </div>
        <label className="flex items-center gap-1 text-xs text-neutral-600">
          <input type="checkbox" name="is_causq_staff" /> CausQ team
        </label>
        <Button type="submit">Add contact</Button>
      </form>

      <ul className="space-y-2">
        {list.map((c) => {
          const org = c.orgs as { name: string } | { name: string }[] | null;
          const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
              <div>
                <div className="font-medium">
                  {c.name}
                  {c.is_causq_staff && (
                    <span className="ml-2 rounded-full border border-[var(--signal)]/40 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-widest text-[var(--signal-deep)]">
                      CausQ
                    </span>
                  )}
                </div>
                <div className="text-neutral-500">
                  {orgName ?? "n/a"}
                  {c.role ? ` · ${c.role}` : ""}
                  {c.email ? ` · ${c.email}` : ""}
                </div>
              </div>
              <form action={deleteContact}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="org_id" value={c.org_id} />
                <button className="text-xs text-red-600 hover:underline">Remove</button>
              </form>
            </li>
          );
        })}
        {list.length === 0 && <li className="text-sm text-neutral-500">No contacts yet.</li>}
      </ul>
    </div>
  );
}
