import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex flex-wrap items-center gap-4 border-b pb-3">
        <span className="font-mono text-xs uppercase tracking-widest text-brand-deep">
          CausQ admin
        </span>
        <nav className="flex flex-wrap gap-3 text-sm">
          {nav.map(([label, href]) => (
            <a key={href} href={href} className="text-neutral-600 hover:text-brand-deep">
              {label}
            </a>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
