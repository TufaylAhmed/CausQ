alter table public.invoices add column if not exists stripe_session_id text;
alter table public.invoices add column if not exists paid_at timestamptz;
