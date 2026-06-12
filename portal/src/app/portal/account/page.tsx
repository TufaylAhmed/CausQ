import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";

function healthClass(h: number): string {
  return h >= 70 ? "health-good" : h >= 40 ? "health-warn" : "health-bad";
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase.from("profiles").select("status, org_id").eq("id", user.id).single();
  if (profile?.status !== "active") redirect("/portal/pending");

  const today = new Date().toISOString().slice(0, 10);

  const { data: org } = profile?.org_id
    ? await supabase.from("orgs").select("name").eq("id", profile.org_id).maybeSingle()
    : { data: null };

  const [{ data: engagements }, { data: invoices }] = await Promise.all([
    supabase.from("engagements").select("id, title, status, progress").order("created_at", { ascending: false }),
    supabase.from("invoices").select("id, status, amount, currency, due_date"),
  ]);

  const projects = engagements ?? [];
  const ids = projects.map((e) => e.id);
  const { data: healthRows } = ids.length
    ? await supabase.from("engagement_health").select("engagement_id, health").in("engagement_id", ids)
    : { data: [] as { engagement_id: string; health: number }[] };
  const healthMap = new Map((healthRows ?? []).map((r) => [r.engagement_id, r.health]));

  const inv = invoices ?? [];
  const ccy = inv[0]?.currency ?? "USD";
  const outstanding = inv.filter((i) => i.status === "sent" || i.status === "overdue");
  const outstandingTotal = outstanding.reduce((s, i) => s + Number(i.amount), 0);
  const overdue = inv.filter((i) => (i.status === "overdue") || (i.status === "sent" && i.due_date && i.due_date < today)).length;
  const paid = inv.filter((i) => i.status === "paid").length;

  const summary = [
    { label: "Projects", value: String(projects.filter((p) => p.status === "active").length), foot: "active" },
    { label: "Outstanding", value: outstandingTotal > 0 ? `${ccy} ${outstandingTotal.toLocaleString()}` : "0", foot: `${overdue} overdue` },
    { label: "Invoices paid", value: String(paid), foot: "to date" },
  ];

  return (
    <PortalShell active="account">
      <div className="reveal">
        <p className="kicker">Account</p>
        <h1 className="mt-3 text-3xl font-semibold">{org?.name ?? "Your account"}</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-mute)]">
          A single view of your projects and billing with CausQ.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {summary.map((s, i) => (
          <div key={s.label} className="panel reveal kpi p-5" style={{ animationDelay: `${0.05 * (i + 1)}s` }}>
            <p className="meta">{s.label}</p>
            <p className="kpi-num mt-3" style={{ fontFamily: "var(--font-display)" }}>
              {s.value}
            </p>
            <p className="meta mt-2 text-[var(--ink-mute)]">{s.foot}</p>
          </div>
        ))}
      </div>

      <section className="panel reveal mt-6" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <p className="kicker">All projects</p>
          <Link href="/portal/projects" className="meta hover:text-[var(--signal-deep)]">
            Open projects &rarr;
          </Link>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {projects.map((e) => {
            const h = healthMap.get(e.id) ?? e.progress;
            return (
              <Link key={e.id} href={`/portal/projects/${e.id}`} className="feed-row flex items-center gap-4 px-5 py-4">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.title}</span>
                <span className={`pill pill-${e.status}`}>{e.status.replace("_", " ")}</span>
                <span className={`health health-sm ${healthClass(h)}`}>{h}</span>
              </Link>
            );
          })}
          {projects.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-[var(--ink-mute)]">No projects yet.</p>
          )}
        </div>
      </section>
    </PortalShell>
  );
}
