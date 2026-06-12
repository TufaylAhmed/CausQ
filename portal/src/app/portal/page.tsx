import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";

type FeedItem = {
  key: string;
  tag: "MSG" | "DOC" | "INV";
  title: string;
  sub: string;
  href: string;
  ts: string;
};

const DAY = 86_400_000;

function healthClass(h: number): string {
  return h >= 70 ? "health-good" : h >= 40 ? "health-warn" : "health-bad";
}

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function PortalHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, status")
    .eq("id", user.id)
    .single();
  if (profile?.status !== "active") redirect("/portal/pending");

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY).toISOString();
  const today = now.toISOString().slice(0, 10);
  const in14 = new Date(now.getTime() + 14 * DAY).toISOString().slice(0, 10);

  // KPI sources (RLS scopes everything to the caller's org automatically).
  const [
    { count: activeCount },
    { data: outstanding },
    { count: overdueCount },
    { count: dueCount },
    { count: unreadMsgs },
    { data: activeEngagements },
    { data: recentMessages },
    { data: recentDocuments },
    { data: recentInvoices },
  ] = await Promise.all([
    supabase.from("engagements").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("invoices").select("amount, currency").in("status", ["sent", "overdue"]),
    supabase.from("invoices").select("id", { count: "exact", head: true }).in("status", ["sent", "overdue"]).lt("due_date", today),
    supabase
      .from("milestones")
      .select("id", { count: "exact", head: true })
      .neq("status", "done")
      .gte("due_date", today)
      .lte("due_date", in14),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("type", "message")
      .is("read_at", null),
    supabase.from("engagements").select("id, title, progress").eq("status", "active").order("created_at", { ascending: false }).limit(6),
    supabase.from("messages").select("id, body, created_at, engagement_id, author_id").gte("created_at", since30).order("created_at", { ascending: false }).limit(10),
    supabase.from("documents").select("id, filename, created_at, engagement_id").gte("created_at", since30).order("created_at", { ascending: false }).limit(10),
    supabase.from("invoices").select("id, number, status, amount, currency, created_at").gte("created_at", since30).order("created_at", { ascending: false }).limit(10),
  ]);

  const outstandingList = outstanding ?? [];
  const outstandingTotal = outstandingList.reduce((s, i) => s + Number(i.amount), 0);
  const outstandingCcy = outstandingList[0]?.currency ?? "USD";

  // Resolve engagement titles and author names for the activity feed.
  const engIds = new Set<string>();
  const authorIds = new Set<string>();
  (recentMessages ?? []).forEach((m) => {
    if (m.engagement_id) engIds.add(m.engagement_id);
    if (m.author_id) authorIds.add(m.author_id);
  });
  (recentDocuments ?? []).forEach((d) => d.engagement_id && engIds.add(d.engagement_id));

  const [{ data: engRows }, { data: authorRows }] = await Promise.all([
    engIds.size
      ? supabase.from("engagements").select("id, title").in("id", [...engIds])
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    authorIds.size
      ? supabase.from("profiles").select("id, name").in("id", [...authorIds])
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
  ]);
  const engTitle = new Map((engRows ?? []).map((e) => [e.id, e.title]));
  const authorName = new Map((authorRows ?? []).map((a) => [a.id, a.name ?? "Someone"]));

  const activeIds = (activeEngagements ?? []).map((e) => e.id);
  const { data: healthRows } = activeIds.length
    ? await supabase.from("engagement_health").select("engagement_id, health").in("engagement_id", activeIds)
    : { data: [] as { engagement_id: string; health: number }[] };
  const healthMap = new Map((healthRows ?? []).map((r) => [r.engagement_id, r.health]));

  const feed: FeedItem[] = [
    ...(recentMessages ?? []).map((m) => ({
      key: `m${m.id}`,
      tag: "MSG" as const,
      title: `${authorName.get(m.author_id) ?? "Someone"} on ${engTitle.get(m.engagement_id ?? "") ?? "a project"}`,
      sub: m.body.length > 90 ? `${m.body.slice(0, 90)}…` : m.body,
      href: `/portal/projects/${m.engagement_id}`,
      ts: m.created_at,
    })),
    ...(recentDocuments ?? []).map((d) => ({
      key: `d${d.id}`,
      tag: "DOC" as const,
      title: d.filename,
      sub: d.engagement_id ? (engTitle.get(d.engagement_id) ?? "Document added") : "Document added",
      href: d.engagement_id ? `/portal/projects/${d.engagement_id}` : "/portal/projects",
      ts: d.created_at,
    })),
    ...(recentInvoices ?? []).map((inv) => ({
      key: `i${inv.id}`,
      tag: "INV" as const,
      title: `Invoice ${inv.number}`,
      sub: `${inv.currency} ${Number(inv.amount).toLocaleString()} · ${inv.status}`,
      href: "/portal/invoices",
      ts: inv.created_at,
    })),
  ]
    .sort((a, b) => +new Date(b.ts) - +new Date(a.ts))
    .slice(0, 12);

  const firstName = (profile?.name ?? user.email ?? "there").split(/[ @]/)[0];

  const kpis = [
    { label: "Active projects", value: String(activeCount ?? 0), foot: "in progress now" },
    {
      label: "Outstanding",
      value: outstandingTotal > 0 ? `${outstandingCcy} ${outstandingTotal.toLocaleString()}` : "0",
      foot: overdueCount && overdueCount > 0 ? `${overdueCount} overdue` : "sent + overdue",
    },
    { label: "Milestones due", value: String(dueCount ?? 0), foot: "next 14 days" },
    { label: "Unread messages", value: String(unreadMsgs ?? 0), foot: "awaiting you" },
  ];

  return (
    <PortalShell active="dashboard">
      <div className="reveal">
        <p className="kicker">Your workspace</p>
        <h1 className="mt-3 text-3xl font-semibold">Welcome back, {firstName}.</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-mute)]">
          A live view across your projects, billing, and the line to your CausQ
          team. Everything in one place, nothing buried.
        </p>
      </div>

      {/* KPI cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className="panel reveal kpi p-5"
            style={{ animationDelay: `${0.05 * (i + 1)}s` }}
          >
            <p className="meta">{k.label}</p>
            <p className="kpi-num mt-3" style={{ fontFamily: "var(--font-display)" }}>
              {k.value}
            </p>
            <p className="meta mt-2 text-[var(--ink-mute)]">{k.foot}</p>
          </div>
        ))}
      </div>

      {/* Feed + quick links */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="panel reveal lg:col-span-2" style={{ animationDelay: "0.28s" }}>
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <p className="kicker">Recent activity</p>
            <span className="meta">last 30 days</span>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {feed.map((f) => (
              <a key={f.key} href={f.href} className="feed-row flex items-start gap-4 px-5 py-4">
                <span className={`feed-tag feed-tag-${f.tag.toLowerCase()}`}>{f.tag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{f.title}</span>
                  <span className="mt-0.5 block truncate text-sm text-[var(--ink-mute)]">{f.sub}</span>
                </span>
                <span className="meta whitespace-nowrap">{ago(f.ts)}</span>
              </a>
            ))}
            {feed.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="kicker justify-center">All quiet</p>
                <p className="mt-3 text-sm text-[var(--ink-mute)]">
                  New messages, documents, and invoices will show up here.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="panel reveal h-fit" style={{ animationDelay: "0.34s" }}>
          <div className="border-b border-[var(--line)] px-5 py-4">
            <p className="kicker">Jump to a project</p>
          </div>
          <div className="p-3">
            {(activeEngagements ?? []).map((e) => {
              const eh = healthMap.get(e.id) ?? e.progress;
              return (
                <a key={e.id} href={`/portal/projects/${e.id}`} className="quick-link block rounded-md px-3 py-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{e.title}</span>
                    <span className={`health health-sm ${healthClass(eh)}`}>{eh}</span>
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="bar flex-1">
                      <span style={{ width: `${e.progress}%` }} />
                    </span>
                    <span className="meta">{e.progress}%</span>
                  </span>
                </a>
              );
            })}
            {(activeEngagements ?? []).length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-[var(--ink-mute)]">
                No active projects yet.
              </p>
            )}
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
