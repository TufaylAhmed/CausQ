import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/portal/signout-action";
import { Wordmark } from "@/components/Wordmark";

type Active = "engagements" | "invoices" | "admin" | undefined;

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
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single();
    isStaff = me?.role === "staff" || me?.role === "admin";
    email = me?.email ?? email;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="appbar sticky top-0 z-20">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-7 px-5">
          <a href="/portal" className="flex items-center">
            <Wordmark variant="white" className="h-6 w-auto" dotSize={6} />
          </a>
          <nav className="appnav hidden items-center gap-6 sm:flex">
            <a href="/portal" className={active === "engagements" ? "active" : ""}>
              Engagements
            </a>
            <a href="/portal/invoices" className={active === "invoices" ? "active" : ""}>
              Invoices
            </a>
            {isStaff && (
              <a href="/admin" className={active === "admin" ? "active" : ""}>
                Admin
              </a>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-4">
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
