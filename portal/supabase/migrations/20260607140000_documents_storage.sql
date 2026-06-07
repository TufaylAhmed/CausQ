-- Private bucket for client deliverables.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Read: staff (all) or active member of the org that owns the top-level folder.
create policy documents_read on storage.objects
  for select using (
    bucket_id = 'documents' and (
      public.auth_is_staff() or (
        public.auth_is_active()
        and (storage.foldername(name))[1] = public.auth_org_id()::text
      )
    )
  );

-- Write (upload/update/delete): staff only.
create policy documents_staff_write on storage.objects
  for all using (
    bucket_id = 'documents' and public.auth_is_staff()
  ) with check (
    bucket_id = 'documents' and public.auth_is_staff()
  );
