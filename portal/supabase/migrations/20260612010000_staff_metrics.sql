-- Phase 5: staff metrics. Cross-org aggregates exposed only to staff. Both are
-- SECURITY DEFINER with an explicit staff guard so clients cannot read them even
-- though the function owner bypasses RLS.

create or replace function public.staff_dashboard_metrics()
returns table (
  active_projects   int,
  revenue_mtd       numeric,
  outstanding       numeric,
  overdue_count     int,
  pending_approvals int,
  open_pipeline     numeric
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_is_staff() then raise exception 'forbidden'; end if;
  return query
  select
    (select count(*)::int from public.engagements where status = 'active'),
    coalesce((select sum(amount) from public.invoices
              where status = 'paid' and paid_at >= date_trunc('month', now())), 0),
    coalesce((select sum(amount) from public.invoices where status in ('sent', 'overdue')), 0),
    (select count(*)::int from public.invoices
      where status in ('sent', 'overdue') and due_date is not null and due_date < current_date),
    (select count(*)::int from public.profiles where status = 'pending'),
    coalesce((select sum(value) from public.opportunities where stage not in ('won', 'lost')), 0);
end;
$$;

-- AR aging of unpaid invoices, bucketed by days past due. Optional date range
-- bounds invoices by creation date.
create or replace function public.ar_aging_report(p_start date default null, p_end date default null)
returns table (bucket text, invoice_count int, total numeric)
language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_is_staff() then raise exception 'forbidden'; end if;
  return query
  with unpaid as (
    select amount,
      case
        when due_date is null or due_date >= current_date then 'current'
        when current_date - due_date <= 30 then '1-30'
        when current_date - due_date <= 60 then '31-60'
        when current_date - due_date <= 90 then '61-90'
        else '90+'
      end as b
    from public.invoices
    where status in ('sent', 'overdue')
      and (p_start is null or created_at::date >= p_start)
      and (p_end is null or created_at::date <= p_end)
  ),
  buckets(b, ord) as (values ('current', 1), ('1-30', 2), ('31-60', 3), ('61-90', 4), ('90+', 5))
  select buckets.b, coalesce(count(u.amount), 0)::int, coalesce(sum(u.amount), 0)
  from buckets left join unpaid u on u.b = buckets.b
  group by buckets.b, buckets.ord
  order by buckets.ord;
end;
$$;

revoke all on function public.staff_dashboard_metrics() from public;
revoke all on function public.ar_aging_report(date, date) from public;
grant execute on function public.staff_dashboard_metrics() to authenticated;
grant execute on function public.ar_aging_report(date, date) to authenticated;
