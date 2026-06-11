begin;
select plan(6);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}'),
  ('00000000-0000-0000-0000-0000000000b1', 'Globex', '{globex.com}');

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'gil@globex.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'pat@acme.com');

set local "request.jwt.claims" to '{}';
update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000a2';
update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set status = 'pending' where id = '00000000-0000-0000-0000-0000000000c2';

insert into public.invoices (id, org_id, number, amount, status) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'INV-A1', 1000, 'sent'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b1', 'INV-B1', 2000, 'sent');

insert into public.invoice_line_items (invoice_id, description, quantity, unit_amount) values
  ('00000000-0000-0000-0000-0000000000f1', 'Acme advisory', 10, 100),
  ('00000000-0000-0000-0000-0000000000f2', 'Globex advisory', 20, 100);

-- Acme client sees only its own invoice's line items.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is(
  (select count(*)::int from public.invoice_line_items),
  1, 'Acme client sees one line item (their own invoice)'
);
select results_eq(
  $$select description from public.invoice_line_items$$,
  $$values ('Acme advisory')$$,
  'Acme client sees only Acme line items'
);

-- Globex client cannot read Acme's line items.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(
  (select count(*)::int from public.invoice_line_items
   where invoice_id = '00000000-0000-0000-0000-0000000000f1'),
  0, 'Globex client cannot read Acme invoice line items'
);

-- Pending Acme user sees nothing.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is(
  (select count(*)::int from public.invoice_line_items),
  0, 'pending user sees no line items'
);

-- A client cannot insert line items (staff-only write).
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$insert into public.invoice_line_items (invoice_id, description) values ('00000000-0000-0000-0000-0000000000f1', 'sneaky')$$,
  '42501', NULL, 'client cannot insert line items'
);

-- Promote Amy to staff as superuser with no JWT (bypasses RLS and the
-- privileged-field guard), then she can insert.
reset role;
set local "request.jwt.claims" to '{}';
update public.profiles set role = 'staff', org_id = null where id = '00000000-0000-0000-0000-0000000000a2';
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$insert into public.invoice_line_items (invoice_id, description, quantity, unit_amount) values ('00000000-0000-0000-0000-0000000000f1', 'staff line', 1, 50)$$,
  'staff can insert line items'
);

select * from finish();
rollback;
