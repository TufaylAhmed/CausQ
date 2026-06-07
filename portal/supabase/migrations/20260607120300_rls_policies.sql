-- Enable RLS on every table.
alter table public.orgs            enable row level security;
alter table public.profiles        enable row level security;
alter table public.engagements     enable row level security;
alter table public.milestones      enable row level security;
alter table public.documents       enable row level security;
alter table public.messages        enable row level security;
alter table public.invoices        enable row level security;
alter table public.invites         enable row level security;
alter table public.access_requests enable row level security;

-- profiles: a user can read/update their own row; staff can read all.
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid() or public.auth_is_staff());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_update on public.profiles
  for update using (public.auth_is_staff()) with check (public.auth_is_staff());

-- orgs: active members of the org can read it; staff read all.
create policy orgs_member_select on public.orgs
  for select using (public.auth_is_staff() or (id = public.auth_org_id() and public.auth_is_active()));
create policy orgs_staff_write on public.orgs
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());

-- engagements: active member of the owning org, or staff.
create policy engagements_select on public.engagements
  for select using (public.auth_is_staff() or (org_id = public.auth_org_id() and public.auth_is_active()));
create policy engagements_staff_write on public.engagements
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());

create policy milestones_select on public.milestones
  for select using (
    public.auth_is_staff() or exists (
      select 1 from public.engagements e
      where e.id = milestones.engagement_id
        and e.org_id = public.auth_org_id()
        and public.auth_is_active()
    )
  );
create policy milestones_staff_write on public.milestones
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());

create policy documents_select on public.documents
  for select using (public.auth_is_staff() or (org_id = public.auth_org_id() and public.auth_is_active()));
create policy documents_staff_write on public.documents
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());

create policy messages_select on public.messages
  for select using (
    public.auth_is_staff() or exists (
      select 1 from public.engagements e
      where e.id = messages.engagement_id
        and e.org_id = public.auth_org_id()
        and public.auth_is_active()
    )
  );
-- clients may post messages on their own engagements.
create policy messages_insert on public.messages
  for insert with check (
    author_id = auth.uid() and exists (
      select 1 from public.engagements e
      where e.id = messages.engagement_id
        and e.org_id = public.auth_org_id()
        and public.auth_is_active()
    )
  );

create policy invoices_select on public.invoices
  for select using (public.auth_is_staff() or (org_id = public.auth_org_id() and public.auth_is_active()));
create policy invoices_staff_write on public.invoices
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());

-- invites and access_requests are staff-only; public inserts go via service role.
create policy invites_staff_all on public.invites
  for all using (public.auth_is_staff()) with check (public.auth_is_staff());
create policy access_requests_staff_select on public.access_requests
  for select using (public.auth_is_staff());
