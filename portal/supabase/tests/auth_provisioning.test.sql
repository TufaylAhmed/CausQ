begin;
select plan(8);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}');

-- Domain match: signup with acme.com -> profile pending, org = Acme.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com');
select is((select org_id from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
          '00000000-0000-0000-0000-0000000000a1', 'domain match sets org');
select is((select status::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
          'pending', 'new profile is pending');

-- Unknown domain: no org.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000e2', 'authenticated', 'authenticated', 'zoe@unknown.io');
select is((select org_id from public.profiles where id = '00000000-0000-0000-0000-0000000000e2'),
          null, 'unknown domain leaves org null');

-- Escalation guard: a pending client cannot self-activate.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000a2'$$,
  'cannot modify privileged profile fields',
  'client cannot self-activate'
);
-- but may change their own name.
select lives_ok(
  $$update public.profiles set name = 'Amy A.' where id = '00000000-0000-0000-0000-0000000000a2'$$,
  'client may edit their own name'
);

-- approve_profile is staff-only.
select throws_ok(
  $$select public.approve_profile('00000000-0000-0000-0000-0000000000a2')$$,
  'forbidden',
  'non-staff cannot approve'
);

-- Make a2 staff (as superuser, no JWT) then approve z2.
reset role;
set local "request.jwt.claims" to '{}';
update public.profiles set role = 'staff', status = 'active' where id = '00000000-0000-0000-0000-0000000000a2';
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$select public.approve_profile('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000a1')$$,
  'staff can approve a pending user'
);
select is(
  (select status::text from public.profiles where id = '00000000-0000-0000-0000-0000000000e2'),
  'active',
  'approved user becomes active'
);

select * from finish();
rollback;
