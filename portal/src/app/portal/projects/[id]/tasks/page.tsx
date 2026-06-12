import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTask, setTaskStatus, deleteTask } from "../tasks-actions";

const COLUMNS: { key: "todo" | "in_progress" | "done"; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export default async function ProjectTasks({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: me } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (me?.status !== "active") redirect("/portal/pending");
  const isStaff = me?.role === "staff" || me?.role === "admin";

  const { data: engagement } = await supabase.from("engagements").select("id, title").eq("id", id).maybeSingle();
  if (!engagement) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, due_date")
    .eq("engagement_id", id)
    .order("sort_order")
    .order("created_at");

  const list = tasks ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <PortalShell active="projects">
      <Link href={`/portal/projects/${id}`} className="meta inline-flex items-center gap-1 hover:text-[var(--signal-deep)]">
        &larr; {engagement.title}
      </Link>

      <div className="reveal mt-4">
        <p className="kicker">Project tasks</p>
        <h1 className="mt-3 text-3xl font-semibold">Tasks</h1>
      </div>

      {isStaff && (
        <form action={addTask} className="reveal panel mt-6 flex flex-wrap items-end gap-2 p-3" style={{ animationDelay: "0.05s" }}>
          <input type="hidden" name="engagement_id" value={id} />
          <div className="min-w-[14rem] flex-1">
            <label className="meta block">New task</label>
            <Input name="title" placeholder="Draft the network topology" required />
          </div>
          <div>
            <label className="meta block">Due</label>
            <Input name="due_date" type="date" />
          </div>
          <Button type="submit">Add task</Button>
        </form>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col, ci) => {
          const items = list.filter((t) => t.status === col.key);
          return (
            <section key={col.key} className="reveal panel p-4" style={{ animationDelay: `${0.1 + ci * 0.05}s` }}>
              <div className="flex items-center justify-between">
                <p className="kicker">{col.label}</p>
                <span className="meta">{items.length}</span>
              </div>
              <ul className="mt-4 space-y-3">
                {items.map((t) => {
                  const overdue = t.status !== "done" && !!t.due_date && t.due_date < today;
                  return (
                    <li key={t.id} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-warm)] p-3">
                      <div className="text-sm">{t.title}</div>
                      {t.due_date && (
                        <div className={`meta mt-1 ${overdue ? "text-[#b4451f]" : ""}`}>
                          {overdue ? "overdue " : "due "}
                          {t.due_date}
                        </div>
                      )}
                      {isStaff && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {col.key !== "todo" && (
                            <StatusButton id={t.id} engagementId={id} to="todo" label="Reopen" />
                          )}
                          {col.key !== "in_progress" && (
                            <StatusButton id={t.id} engagementId={id} to="in_progress" label="Start" />
                          )}
                          {col.key !== "done" && (
                            <StatusButton id={t.id} engagementId={id} to="done" label="Done" />
                          )}
                          <form action={deleteTask} className="ml-auto">
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="engagement_id" value={id} />
                            <button className="meta hover:text-[#b4451f]">Remove</button>
                          </form>
                        </div>
                      )}
                    </li>
                  );
                })}
                {items.length === 0 && <li className="meta">None</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </PortalShell>
  );
}

function StatusButton({ id, engagementId, to, label }: { id: string; engagementId: string; to: string; label: string }) {
  return (
    <form action={setTaskStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="engagement_id" value={engagementId} />
      <input type="hidden" name="status" value={to} />
      <button className="rounded border border-[var(--line)] bg-[var(--paper)] px-2 py-1 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--ink-mute)] transition-colors hover:border-[var(--signal)] hover:text-[var(--signal-deep)]">
        {label}
      </button>
    </form>
  );
}
