import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PortalHome() {
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
    .select("id, title, status, progress")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your engagements</h1>
        <a href="/portal/invoices" className="text-sm text-brand-deep underline">
          Invoices →
        </a>
      </div>
      <ul className="space-y-2">
        {(engagements ?? []).map((e) => (
          <li key={e.id}>
            <a
              href={`/portal/engagements/${e.id}`}
              className="block rounded border p-3 transition-colors hover:border-brand"
            >
              <div className="font-medium">{e.title}</div>
              <div className="text-sm text-neutral-500">
                {e.status} · {e.progress}%
              </div>
            </a>
          </li>
        ))}
        {(!engagements || engagements.length === 0) && (
          <li className="text-sm text-neutral-500">No engagements yet.</li>
        )}
      </ul>
    </div>
  );
}
