import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/portal/signout-action";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();
  if (!me || me.status !== "active" || !["staff", "admin"].includes(me.role)) {
    redirect("/portal");
  }

  const nav: [string, string][] = [
    ["Overview", "/admin"],
    ["Orgs", "/admin/orgs"],
    ["Engagements", "/admin/engagements"],
    ["Invites", "/admin/invites"],
    ["Invoices", "/admin/invoices"],
    ["Requests", "/admin/requests"],
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="appbar sticky top-0 z-20">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-5">
          <a href="/portal" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/causq-white.png" alt="CausQ" className="h-6 w-auto" />
          </a>
          <span className="rounded-full border border-[var(--signal)]/40 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--signal)]">
            Admin
          </span>
          <div className="ml-auto flex items-center gap-4">
            <a
              href="/portal"
              className="font-mono text-[0.7rem] uppercase tracking-widest text-white/55 hover:text-white"
            >
              Portal
            </a>
            <form action={signOut}>
              <button className="font-mono text-[0.7rem] uppercase tracking-widest text-white/55 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-white/5">
          <nav className="appnav mx-auto flex w-full max-w-5xl items-center gap-5 overflow-x-auto px-5 py-2.5">
            {nav.map(([label, href]) => (
              <a key={href} href={href} className="whitespace-nowrap">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">{children}</main>
    </div>
  );
}
