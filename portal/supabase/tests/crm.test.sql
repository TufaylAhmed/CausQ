begin;
select plan(10);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}'),
  ('00000000-0000-0000-0000-0000000000b1', 'Globex', '{globex.com}');

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'gil@globex.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'pat@acme.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', 'sam@causq.com');

set local "request.jwt.claims" to '{}';
update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000a2';
update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set status = 'pending' where id = '00000000-0000-0000-0000-0000000000c2';
update public.profiles set role = 'staff', status = 'active', org_id = null where id = '00000000-0000-0000-0000-0000000000d2';

-- One CausQ-staff contact and one client-side contact for Acme; one for Globex.
insert into public.contacts (org_id, name, is_causq_staff) values
  ('00000000-0000-0000-0000-0000000000a1', 'CausQ Lead (Acme)', true),
  ('00000000-0000-0000-0000-0000000000a1', 'Acme Buyer', false),
  ('00000000-0000-0000-0000-0000000000b1', 'CausQ Lead (Globex)', true);

insert into public.opportunities (org_id, title, stage, value) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme expansion', 'proposal', 50000),
  ('00000000-0000-0000-0000-0000000000b1', 'Globex renewal', 'qualified', 30000);

insert into public.activity_log (org_id, kind, summary) values
  ('00000000-0000-0000-0000-0000000000a1', 'note', 'Kickoff call went well');

-- Acme client.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is(
  (select count(*)::int from public.contacts),
  1, 'Acme client sees only its CausQ-staff contact'
);
select is(
  (select name from public.contacts),
  'CausQ Lead (Acme)', 'the visible contact is the CausQ team member'
);
select is(
  (select count(*)::int from public.opportunities),
  0, 'client cannot read any opportunities'
);
select is(
  (select count(*)::int from public.activity_log),
  0, 'client cannot read the activity log'
);
select throws_ok(
  $$insert into public.opportunities (org_id, title) values ('00000000-0000-0000-0000-0000000000a1', 'sneaky')$$,
  '42501', NULL, 'client cannot insert opportunities'
);

-- Globex client cannot see Acme's CausQ contact.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(
  (select count(*)::int from public.contacts where org_id = '00000000-0000-0000-0000-0000000000a1'),
  0, 'Globex client cannot see Acme contacts'
);

-- Pending user sees nothing.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from public.contacts), 0, 'pending user sees no contacts');
select is((select count(*)::int from public.opportunities), 0, 'pending user sees no opportunities');

-- Staff sees everything.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select is((select count(*)::int from public.opportunities), 2, 'staff sees all opportunities');
select is((select count(*)::int from public.contacts), 3, 'staff sees all contacts');

select * from finish();
rollback;
