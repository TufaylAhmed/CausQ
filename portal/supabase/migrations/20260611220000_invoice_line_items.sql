-- Itemized invoice lines. Read by the owning org's active members (or staff);
-- written by staff only. Line total is quantity * unit_amount (computed in app).
create table public.invoice_line_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity    numeric(12,2) not null default 1,
  unit_amount numeric(12,2) not null default 0,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_line_items_invoice on public.invoice_line_items (invoice_id);

alter table public.invoice_line_items enable row level security;

create policy line_items_select on public.invoice_line_items
  for select using (
    public.auth_is_staff() or exists (
      select 1 from public.invoices i
      where i.id = invoice_line_items.invoice_id
        and i.org_id = public.auth_org_id()
        and public.auth_is_active()
    )
  );
create policy line_items_staff_write on public.invoice_line_items
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());
