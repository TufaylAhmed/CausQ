import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";

function healthClass(h: number): string {
  return h >= 70 ? "health-good" : h >= 40 ? "health-warn" : "health-bad";
}

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (profile?.status !== "active") redirect("/portal/pending");

  const { data: engagements } = await supabase
    .from("engagements")
    .select("id, title, summary, status, progress")
    .order("created_at", { ascending: false });

  const list = engagements ?? [];

  const ids = list.map((e) => e.id);
  const { data: healthRows } = ids.length
    ? await supabase.from("engagement_health").select("engagement_id, health").in("engagement_id", ids)
    : { data: [] as { engagement_id: string; health: number }[] };
  const healthMap = new Map((healthRows ?? []).map((r) => [r.engagement_id, r.health]));

  return (
    <PortalShell active="projects">
      <div className="reveal">
        <p className="kicker">Your workspace</p>
        <h1 className="mt-3 text-3xl font-semibold">Projects</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-mute)]">
          Every program we run with you, with live status, deliverables, and the
          line to your engagement lead.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {list.map((e, i) => (
          <a
            key={e.id}
            href={`/portal/engagements/${e.id}`}
            className="panel panel-hover reveal block p-5"
            style={{ animationDelay: `${0.05 * (i + 1)}s` }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold leading-snug">{e.title}</h2>
              <span className="flex flex-none items-center gap-2">
                <span className={`health health-sm ${healthClass(healthMap.get(e.id) ?? e.progress)}`}>
                  {healthMap.get(e.id) ?? e.progress}
                </span>
                <span className={`pill pill-${e.status}`}>{e.status.replace("_", " ")}</span>
              </span>
            </div>
            {e.summary && (
              <p className="mt-2 line-clamp-2 text-sm text-[var(--ink-mute)]">{e.summary}</p>
            )}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="meta">Progress</span>
                <span className="meta">{e.progress}%</span>
              </div>
              <div className="bar">
                <span style={{ width: `${e.progress}%` }} />
              </div>
            </div>
          </a>
        ))}

        {list.length === 0 && (
          <div className="panel col-span-full p-8 text-center">
            <p className="kicker justify-center">Nothing here yet</p>
            <p className="mt-3 text-sm text-[var(--ink-mute)]">
              Your projects will appear here once your CausQ lead sets them up.
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
