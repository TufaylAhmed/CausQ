import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/portal/signout-action";
import { Wordmark } from "@/components/Wordmark";

type Active =
  | "dashboard"
  | "projects"
  | "invoices"
  | "notifications"
  | "contacts"
  | "account"
  | "admin"
  | undefined;

export async function PortalShell({
  active,
  children,
}: {
  active?: Active;
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isStaff = false;
  let email = user?.email ?? "";
  let unread = 0;
  if (user) {
    const [{ data: me }, { data: count }] = await Promise.all([
      supabase.from("profiles").select("role, email").eq("id", user.id).single(),
      supabase.rpc("unread_notification_count"),
    ]);
    isStaff = me?.role === "staff" || me?.role === "admin";
    email = me?.email ?? email;
    unread = typeof count === "number" ? count : 0;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="appbar sticky top-0 z-20">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-7 px-5">
          <a href="/portal" className="flex items-center">
            <Wordmark variant="white" className="h-6 w-auto" dotSize={6} />
          </a>
          <nav className="appnav hidden items-center gap-6 sm:flex">
            <a href="/portal" className={active === "dashboard" ? "active" : ""}>
              Dashboard
            </a>
            <Link href="/portal/projects" className={active === "projects" ? "active" : ""}>
              Projects
            </Link>
            <Link href="/portal/invoices" className={active === "invoices" ? "active" : ""}>
              Invoices
            </Link>
            <a href="/portal/contacts" className={active === "contacts" ? "active" : ""}>
              Contacts
            </a>
            <a href="/portal/account" className={active === "account" ? "active" : ""}>
              Account
            </a>
            {isStaff && (
              <a href="/admin" className={active === "admin" ? "active" : ""}>
                Admin
              </a>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <a
              href="/portal/notifications"
              className={`bell ${active === "notifications" ? "bell-on" : ""}`}
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {unread > 0 && <span className="bell-badge">{unread > 99 ? "99+" : unread}</span>}
            </a>
            <span className="meta hidden md:inline" style={{ color: "rgba(231,231,234,0.45)" }}>
              {email}
            </span>
            <form action={signOut}>
              <button className="font-mono text-[0.7rem] uppercase tracking-widest text-white/55 transition-colors hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-5 pb-8 pt-2">
        <p className="meta">CausQ client portal &middot; secure by design</p>
      </footer>
    </div>
  );
}
