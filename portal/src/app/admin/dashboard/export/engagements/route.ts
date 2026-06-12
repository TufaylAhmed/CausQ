import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (!me || me.status !== "active" || !["staff", "admin"].includes(me.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: engagements } = await supabase
    .from("engagements")
    .select("title, status, progress, start_date, end_date, created_at, orgs(name)")
    .order("created_at", { ascending: false });

  const rows = (engagements ?? []).map((e) => {
    const org = e.orgs as { name: string } | { name: string }[] | null;
    const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
    return [e.title, orgName ?? "", e.status, e.progress, e.start_date ?? "", e.end_date ?? "", e.created_at];
  });

  const csv = toCsv(
    ["title", "org", "status", "progress", "start_date", "end_date", "created_at"],
    rows
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="engagements-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
