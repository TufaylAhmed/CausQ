import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { markRead, markAllRead } from "./actions";

const TAG: Record<string, { label: string; cls: string }> = {
  message: { label: "MSG", cls: "feed-tag-msg" },
  document: { label: "DOC", cls: "feed-tag-doc" },
  invoice: { label: "INV", cls: "feed-tag-inv" },
  milestone: { label: "MS", cls: "feed-tag-ms" },
};

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

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const unreadOnly = filter === "unread";

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

  let query = supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (unreadOnly) query = query.is("read_at", null);

  const { data: notifications } = await query;
  const list = notifications ?? [];
  const hasUnread = list.some((n) => !n.read_at);

  return (
    <PortalShell active="notifications">
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Stay in the loop</p>
          <h1 className="mt-3 text-3xl font-semibold">Notifications</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--ink-mute)]">
            Messages from your team, new documents, invoices, and milestones, as
            they happen.
          </p>
        </div>
        {hasUnread && (
          <form action={markAllRead}>
            <button className="btn-ghost">Mark all read</button>
          </form>
        )}
      </div>

      <div className="reveal mt-6 flex items-center gap-2" style={{ animationDelay: "0.05s" }}>
        <a href="/portal/notifications" className={`seg ${!unreadOnly ? "seg-on" : ""}`}>
          All
        </a>
        <a href="/portal/notifications?filter=unread" className={`seg ${unreadOnly ? "seg-on" : ""}`}>
          Unread
        </a>
      </div>

      <div className="reveal panel mt-4 divide-y divide-[var(--line)]" style={{ animationDelay: "0.1s" }}>
        {list.map((n) => {
          const tag = TAG[n.type] ?? { label: n.type.slice(0, 3).toUpperCase(), cls: "feed-tag-msg" };
          const unread = !n.read_at;
          return (
            <div key={n.id} className={`flex items-start gap-4 px-5 py-4 ${unread ? "is-unread" : ""}`}>
              <span className={`feed-tag ${tag.cls}`}>{tag.label}</span>
              <div className="min-w-0 flex-1">
                {n.link ? (
                  <a href={n.link} className="block truncate text-sm font-medium hover:text-[var(--signal-deep)]">
                    {n.title}
                  </a>
                ) : (
                  <span className="block truncate text-sm font-medium">{n.title}</span>
                )}
                {n.body && (
                  <span className="mt-0.5 block truncate text-sm text-[var(--ink-mute)]">{n.body}</span>
                )}
              </div>
              <span className="meta whitespace-nowrap">{ago(n.created_at)}</span>
              {unread && (
                <form action={markRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="dot-btn" title="Mark read" aria-label="Mark read" />
                </form>
              )}
            </div>
          );
        })}

        {list.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="kicker justify-center">{unreadOnly ? "Nothing unread" : "No notifications yet"}</p>
            <p className="mt-3 text-sm text-[var(--ink-mute)]">
              {unreadOnly
                ? "You are all caught up."
                : "We will let you know the moment something needs your attention."}
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
