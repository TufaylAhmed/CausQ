begin;
select plan(6);

-- Auth users are required because public.profiles.id references auth.users(id).
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'gil@globex.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'pat@acme.com');

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme',   '{acme.com}'),
  ('00000000-0000-0000-0000-0000000000b1', 'Globex', '{globex.com}');

insert into public.profiles (id, email, org_id, role, status) values
  ('00000000-0000-0000-0000-0000000000a2', 'amy@acme.com',   '00000000-0000-0000-0000-0000000000a1', 'client', 'active'),
  ('00000000-0000-0000-0000-0000000000b2', 'gil@globex.com', '00000000-0000-0000-0000-0000000000b1', 'client', 'active'),
  ('00000000-0000-0000-0000-0000000000c2', 'pat@acme.com',   '00000000-0000-0000-0000-0000000000a1', 'client', 'pending');

insert into public.engagements (id, org_id, title) values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'Acme engagement'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b1', 'Globex engagement');

insert into public.invoices (org_id, number, amount) values
  ('00000000-0000-0000-0000-0000000000a1', 'INV-A1', 100),
  ('00000000-0000-0000-0000-0000000000b1', 'INV-B1', 200);

-- Act as the Acme client.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

select is(
  (select count(*)::int from public.engagements),
  1,
  'Acme client sees exactly one (their own) engagement'
);
select results_eq(
  'select number from public.invoices order by number',
  $$values ('INV-A1')$$,
  'Acme client sees only Acme invoices'
);

-- Act as the Globex client.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select results_eq(
  'select title from public.engagements order by title',
  $$values ('Globex engagement')$$,
  'Globex client sees only Globex engagement'
);
select is(
  (select count(*)::int from public.engagements
   where id = '00000000-0000-0000-0000-0000000000a3'),
  0,
  'Globex client cannot read a specific Acme engagement by id'
);

-- Act as a pending Acme user.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is(
  (select count(*)::int from public.engagements),
  0,
  'Pending user sees no engagements'
);
select is(
  (select count(*)::int from public.invoices),
  0,
  'Pending user sees no invoices'
);

select * from finish();
rollback;
