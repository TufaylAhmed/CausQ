import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArAgingChart } from "./ArAgingChart";

function money(n: number): string {
  return `USD ${Number(n).toLocaleString()}`;
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ data: metricsRows }, { data: aging }] = await Promise.all([
    supabase.rpc("staff_dashboard_metrics"),
    supabase.rpc("ar_aging_report"),
  ]);
  const m = metricsRows?.[0];
  const agingData = (aging ?? []).map((a) => ({ bucket: a.bucket, total: Number(a.total) }));

  const cards = [
    { label: "Active projects", value: String(m?.active_projects ?? 0) },
    { label: "Revenue MTD", value: money(m?.revenue_mtd ?? 0) },
    { label: "Outstanding", value: money(m?.outstanding ?? 0) },
    { label: "Overdue invoices", value: String(m?.overdue_count ?? 0) },
    { label: "Pending approvals", value: String(m?.pending_approvals ?? 0), href: "/admin" },
    { label: "Open pipeline", value: money(m?.open_pipeline ?? 0), href: "/admin/crm" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Metrics</h1>
        <div className="flex items-center gap-3 text-sm">
          <a href="/admin/dashboard/export/invoices" className="text-neutral-500 hover:text-neutral-800">
            Invoices CSV
          </a>
          <a href="/admin/dashboard/export/engagements" className="text-neutral-500 hover:text-neutral-800">
            Engagements CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => {
          const inner = (
            <>
              <div className="text-xs uppercase tracking-wide text-neutral-500">{c.label}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{c.value}</div>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="rounded border bg-white p-4 transition-colors hover:border-neutral-400">
              {inner}
            </Link>
          ) : (
            <div key={c.label} className="rounded border bg-white p-4">
              {inner}
            </div>
          );
        })}
      </div>

      <section className="rounded border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">AR aging</h2>
          <span className="text-xs text-neutral-400">outstanding invoices by days past due</span>
        </div>
        <ArAgingChart data={agingData} />
      </section>
    </div>
  );
}
