begin;
select plan(10);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}');

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'pat@acme.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', 'sam@causq.com');

set local "request.jwt.claims" to '{}';
update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000a2';
-- pat stays pending (auto-created pending) -> counts as 1 pending approval.
update public.profiles set role = 'staff', status = 'active', org_id = null where id = '00000000-0000-0000-0000-0000000000d2';

insert into public.engagements (org_id, title, status) values
  ('00000000-0000-0000-0000-0000000000a1', 'P1', 'active'),
  ('00000000-0000-0000-0000-0000000000a1', 'P2', 'active'),
  ('00000000-0000-0000-0000-0000000000a1', 'P3', 'closed');

insert into public.invoices (org_id, number, amount, status, paid_at, due_date) values
  ('00000000-0000-0000-0000-0000000000a1', 'INV-PAID', 1000, 'paid', now(), current_date - 20),
  ('00000000-0000-0000-0000-0000000000a1', 'INV-OD',    500, 'overdue', null, current_date - 10),
  ('00000000-0000-0000-0000-0000000000a1', 'INV-CUR',   200, 'sent',    null, current_date + 10);

insert into public.opportunities (org_id, title, stage, value) values
  ('00000000-0000-0000-0000-0000000000a1', 'Pipe', 'proposal', 5000),
  ('00000000-0000-0000-0000-0000000000a1', 'Won deal', 'won', 9999);

-- Staff reads metrics. Assert each metric equals the equivalent raw query
-- (the acceptance criterion: "metrics match raw queries"). Robust to any data
-- already present in the database.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select is(
  (select active_projects from public.staff_dashboard_metrics()),
  (select count(*)::int from public.engagements where status = 'active'),
  'active_projects matches raw query'
);
select is(
  (select revenue_mtd from public.staff_dashboard_metrics()),
  coalesce((select sum(amount) from public.invoices where status = 'paid' and paid_at >= date_trunc('month', now())), 0),
  'revenue_mtd matches raw query'
);
select is(
  (select outstanding from public.staff_dashboard_metrics()),
  coalesce((select sum(amount) from public.invoices where status in ('sent', 'overdue')), 0),
  'outstanding matches raw query'
);
select is(
  (select overdue_count from public.staff_dashboard_metrics()),
  (select count(*)::int from public.invoices where status in ('sent', 'overdue') and due_date is not null and due_date < current_date),
  'overdue_count matches raw query'
);
select is(
  (select pending_approvals from public.staff_dashboard_metrics()),
  (select count(*)::int from public.profiles where status = 'pending'),
  'pending_approvals matches raw query'
);
select is(
  (select open_pipeline from public.staff_dashboard_metrics()),
  coalesce((select sum(value) from public.opportunities where stage not in ('won', 'lost')), 0),
  'open_pipeline matches raw query'
);

-- AR aging: five buckets, totals reconcile with outstanding.
select is((select count(*)::int from public.ar_aging_report()), 5, 'AR aging returns five buckets');
select is(
  (select sum(total) from public.ar_aging_report()),
  coalesce((select sum(amount) from public.invoices where status in ('sent', 'overdue')), 0),
  'AR aging totals reconcile with outstanding'
);

-- Client cannot read staff metrics.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$select * from public.staff_dashboard_metrics()$$,
  'forbidden', 'client cannot read staff dashboard metrics'
);
select throws_ok(
  $$select * from public.ar_aging_report()$$,
  'forbidden', 'client cannot read the AR aging report'
);

select * from finish();
rollback;
