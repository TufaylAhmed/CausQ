import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (profile?.status !== "active") redirect("/portal/pending");

  // RLS limits clients to the CausQ team assigned to their org.
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, role, email")
    .eq("is_causq_staff", true)
    .order("name");
  const list = contacts ?? [];

  return (
    <PortalShell active="contacts">
      <div className="reveal">
        <p className="kicker">Your team</p>
        <h1 className="mt-3 text-3xl font-semibold">Your CausQ team</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-mute)]">
          The engineers and advisors assigned to your account. Reach any of them
          through your projects, or by email.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c, i) => (
          <div key={c.id} className="panel reveal p-5" style={{ animationDelay: `${0.05 * (i + 1)}s` }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ecfbfe] font-mono text-sm font-semibold text-[var(--signal-deep)]">
              {c.name.slice(0, 1).toUpperCase()}
            </div>
            <h2 className="mt-3 text-base font-semibold">{c.name}</h2>
            {c.role && <p className="meta mt-0.5">{c.role}</p>}
            {c.email && (
              <a href={`mailto:${c.email}`} className="mt-2 block truncate text-sm text-[var(--signal-deep)] hover:underline">
                {c.email}
              </a>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <div className="panel col-span-full p-8 text-center">
            <p className="kicker justify-center">No contacts yet</p>
            <p className="mt-3 text-sm text-[var(--ink-mute)]">
              Your CausQ team will appear here once your engagement is set up.
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
