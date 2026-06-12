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

  const { data: invoices } = await supabase
    .from("invoices")
    .select("number, amount, currency, status, due_date, paid_at, created_at, orgs(name)")
    .order("created_at", { ascending: false });

  const rows = (invoices ?? []).map((i) => {
    const org = i.orgs as { name: string } | { name: string }[] | null;
    const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
    return [i.number, orgName ?? "", i.amount, i.currency, i.status, i.due_date ?? "", i.paid_at ?? "", i.created_at];
  });

  const csv = toCsv(
    ["number", "org", "amount", "currency", "status", "due_date", "paid_at", "created_at"],
    rows
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoices-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
