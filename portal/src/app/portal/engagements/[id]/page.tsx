import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { DocumentRow } from "./DocumentRow";
import { UploadForm } from "./UploadForm";
import { MessageComposer } from "./MessageComposer";

export default async function EngagementDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isStaff = me?.role === "staff" || me?.role === "admin";

  const { data: engagement } = await supabase
    .from("engagements")
    .select("id, title, summary, status, progress")
    .eq("id", id)
    .maybeSingle();
  if (!engagement) notFound();

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, title, status")
    .eq("engagement_id", id)
    .order("sort");

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, storage_path")
    .eq("engagement_id", id)
    .order("created_at", { ascending: false });

  const { data: messages } = await supabase.rpc("engagement_messages", {
    p_engagement: id,
  });

  return (
    <PortalShell active="engagements">
      <a href="/portal" className="meta inline-flex items-center gap-1 hover:text-[var(--signal-deep)]">
        &larr; All engagements
      </a>

      <div className="reveal mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">Engagement</p>
          <h1 className="mt-3 text-3xl font-semibold">{engagement.title}</h1>
          {engagement.summary && (
            <p className="mt-2 max-w-xl text-sm text-[var(--ink-mute)]">{engagement.summary}</p>
          )}
        </div>
        <span className={`pill pill-${engagement.status} mt-2`}>
          {engagement.status.replace("_", " ")}
        </span>
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
            {isStaff && <UploadForm engagementId={id} />}
            {(documents ?? []).map((d) => (
              <DocumentRow key={d.id} path={d.storage_path} filename={d.filename} />
            ))}
            {(!documents || documents.length === 0) && (
              <p className="text-sm text-[var(--ink-mute)]">No documents yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Messages */}
      <section className="reveal panel mt-6 p-5" style={{ animationDelay: "0.15s" }}>
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
