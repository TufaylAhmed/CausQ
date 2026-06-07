import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { DocumentRow } from "./DocumentRow";
import { UploadForm } from "./UploadForm";

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

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <a href="/portal" className="text-sm text-brand-deep underline">
        ← All engagements
      </a>
      <div>
        <h1 className="text-2xl font-semibold">{engagement.title}</h1>
        <p className="text-sm text-neutral-500">
          {engagement.status} · {engagement.progress}%
        </p>
        {engagement.summary && (
          <p className="mt-2 text-neutral-700">{engagement.summary}</p>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Milestones</h2>
        <ul className="space-y-1">
          {(milestones ?? []).map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              <span className={m.status === "done" ? "text-brand-deep" : "text-neutral-400"}>
                {m.status === "done" ? "✓" : "○"}
              </span>
              <span>{m.title}</span>
              <span className="text-neutral-400">· {m.status}</span>
            </li>
          ))}
          {(!milestones || milestones.length === 0) && (
            <li className="text-sm text-neutral-500">No milestones yet.</li>
          )}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Documents</h2>
        {isStaff && <UploadForm engagementId={id} />}
        <div className="space-y-2">
          {(documents ?? []).map((d) => (
            <DocumentRow key={d.id} path={d.storage_path} filename={d.filename} />
          ))}
          {(!documents || documents.length === 0) && (
            <p className="text-sm text-neutral-500">No documents yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
