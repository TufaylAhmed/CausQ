import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { DocumentRow } from "./DocumentRow";
import { UploadForm } from "./UploadForm";
import { ClientUploadForm } from "./ClientUploadForm";
import { MessageComposer } from "./MessageComposer";
import { deleteDocument } from "./upload-actions";
import { ConfirmButton } from "@/components/ConfirmButton";

function healthClass(h: number): string {
  return h >= 70 ? "health-good" : h >= 40 ? "health-warn" : "health-bad";
}

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = me?.role === "staff" || me?.role === "admin";

  const { data: engagement } = await supabase
    .from("engagements")
    .select("id, title, summary, status, progress")
    .eq("id", id)
    .maybeSingle();
  if (!engagement) notFound();

  const [{ data: milestones }, { data: documents }, { data: messages }, { data: tasks }, { data: health }] =
    await Promise.all([
      supabase.from("milestones").select("id, title, status").eq("engagement_id", id).order("sort"),
      supabase.from("documents").select("id, filename, storage_path").eq("engagement_id", id).order("created_at", { ascending: false }),
      supabase.rpc("engagement_messages", { p_engagement: id }),
      supabase.from("tasks").select("id, title, status, due_date").eq("engagement_id", id).order("sort_order").order("created_at").limit(5),
      supabase.from("engagement_health").select("health, tasks_overdue").eq("engagement_id", id).maybeSingle(),
    ]);

  const taskList = tasks ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const h = health?.health ?? engagement.progress;

  return (
    <PortalShell active="projects">
      <Link href="/portal/projects" className="meta inline-flex items-center gap-1 hover:text-[var(--signal-deep)]">
        &larr; All projects
      </Link>

      <div className="reveal mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">Project</p>
          <h1 className="mt-3 text-3xl font-semibold">{engagement.title}</h1>
          {engagement.summary && (
            <p className="mt-2 max-w-xl text-sm text-[var(--ink-mute)]">{engagement.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`health ${healthClass(h)}`}>
            <span className="health-num">{h}</span>
            <span className="health-label">health</span>
          </span>
          <span className={`pill pill-${engagement.status} mt-1`}>{engagement.status.replace("_", " ")}</span>
        </div>
      </div>

      <div className="mt-5 max-w-md">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="meta">Progress</span>
          <span className="meta">{engagement.progress}%</span>
        </div>
        <div className="bar">
          <span style={{ width: `${engagement.progress}%` }} />
        </div>
      </div>

      <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Milestones */}
        <section className="reveal panel p-5" style={{ animationDelay: "0.05s" }}>
          <p className="kicker">Milestones</p>
          <ul className="mt-4 space-y-3">
            {(milestones ?? []).map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <span
                  className={
                    "grid h-5 w-5 flex-none place-items-center rounded-full text-[0.6rem] " +
                    (m.status === "done"
                      ? "bg-[#0f7a4f] text-white"
                      : m.status === "in_progress"
                        ? "bg-[var(--signal)] text-[#06222a]"
                        : "border border-[var(--line-strong)] text-transparent")
                  }
                >
                  {m.status === "done" ? "✓" : "•"}
                </span>
                <span className="flex-1 text-sm">{m.title}</span>
                <span className={`pill pill-${m.status}`}>{m.status.replace("_", " ")}</span>
              </li>
            ))}
            {(!milestones || milestones.length === 0) && (
              <li className="text-sm text-[var(--ink-mute)]">No milestones yet.</li>
            )}
          </ul>
        </section>

        {/* Documents */}
        <section className="reveal panel p-5" style={{ animationDelay: "0.1s" }}>
          <p className="kicker">Documents &amp; deliverables</p>
          <div className="mt-4 space-y-2">
            {isStaff ? <UploadForm engagementId={id} /> : <ClientUploadForm engagementId={id} />}
            {(documents ?? []).map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DocumentRow path={d.storage_path} filename={d.filename} />
                </div>
                {isStaff && (
                  <form action={deleteDocument}>
                    <input type="hidden" name="id" value={d.id} />
                    <ConfirmButton message={`Delete "${d.filename}"?`} className="px-1 text-xs text-red-600 hover:underline">
                      Delete
                    </ConfirmButton>
                  </form>
                )}
              </div>
            ))}
            {(!documents || documents.length === 0) && (
              <p className="text-sm text-[var(--ink-mute)]">No documents yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Tasks */}
      <section className="reveal panel mt-6 p-5" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center justify-between">
          <p className="kicker">Tasks</p>
          <Link href={`/portal/projects/${id}/tasks`} className="meta hover:text-[var(--signal-deep)]">
            View all &rarr;
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {taskList.map((t) => {
            const overdue = t.status !== "done" && !!t.due_date && t.due_date < today;
            return (
              <li key={t.id} className="flex items-center gap-3 border-b border-[var(--line)] pb-2 last:border-0">
                <span className="flex-1 text-sm">{t.title}</span>
                {t.due_date && (
                  <span className={`meta ${overdue ? "text-[#b4451f]" : ""}`}>
                    {overdue ? "overdue " : "due "}
                    {t.due_date}
                  </span>
                )}
                <span className={`pill pill-${t.status}`}>{t.status.replace("_", " ")}</span>
              </li>
            );
          })}
          {taskList.length === 0 && <li className="text-sm text-[var(--ink-mute)]">No tasks yet.</li>}
        </ul>
      </section>

      {/* Messages */}
      <section className="reveal panel mt-6 p-5" style={{ animationDelay: "0.2s" }}>
        <p className="kicker">Messages</p>
        <ul className="mt-4 space-y-3">
          {(messages ?? []).map((m) => {
            const mine = m.author_id === user.id;
            return (
              <li
                key={m.id}
                className={
                  "max-w-[80%] rounded-[var(--radius)] border p-3 " +
                  (mine
                    ? "ml-auto border-[rgba(6,182,212,0.35)] bg-[#ecfbfe]"
                    : "border-[var(--line)] bg-[var(--paper-warm)]")
                }
              >
                <div className="meta mb-1">
                  {m.author_name ?? "Member"}
                  {m.author_role === "client" ? "" : " · CausQ"}
                </div>
                <div className="text-sm">{m.body}</div>
              </li>
            );
          })}
          {(!messages || messages.length === 0) && (
            <li className="text-sm text-[var(--ink-mute)]">No messages yet. Start the conversation below.</li>
          )}
        </ul>
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <MessageComposer engagementId={id} />
        </div>
      </section>
    </PortalShell>
  );
}
