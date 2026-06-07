begin;
select plan(4);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}'),
  ('00000000-0000-0000-0000-0000000000b1', 'Globex', '{globex.com}');

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'gil@globex.com');

update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', status = 'active'
  where id = '00000000-0000-0000-0000-0000000000a2';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000b1', status = 'active'
  where id = '00000000-0000-0000-0000-0000000000b2';

insert into storage.buckets (id, name, public) values ('documents','documents',false)
  on conflict (id) do nothing;

insert into storage.objects (bucket_id, name) values
  ('documents', '00000000-0000-0000-0000-0000000000a1/acme.pdf'),
  ('documents', '00000000-0000-0000-0000-0000000000b1/globex.pdf');

-- Acme sees only its own object.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from storage.objects where bucket_id='documents'), 1, 'Acme sees one object');
select results_eq(
  $$select name from storage.objects where bucket_id='documents'$$,
  $$values ('00000000-0000-0000-0000-0000000000a1/acme.pdf')$$,
  'Acme sees only its own file'
);

-- Globex sees only its own object.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is((select count(*)::int from storage.objects where bucket_id='documents'), 1, 'Globex sees one object');
select results_eq(
  $$select name from storage.objects where bucket_id='documents'$$,
  $$values ('00000000-0000-0000-0000-0000000000b1/globex.pdf')$$,
  'Globex sees only its own file'
);

select * from finish();
rollback;
