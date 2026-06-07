begin;
select plan(6);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}');

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'sam@causq.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com');

set local "request.jwt.claims" to '{}';
update public.profiles set role = 'admin', status = 'active', org_id = null where id = '00000000-0000-0000-0000-0000000000c2';
update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000a2';

-- Non-staff client is forbidden from admin RPCs.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$select public.create_invite('00000000-0000-0000-0000-0000000000a1', 'x@acme.com')$$,
  'forbidden', 'client cannot create invite');
select throws_ok(
  $$select public.log_admin_action('test')$$, 'forbidden', 'client cannot write audit');

-- Staff/admin can.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select isnt(
  (select public.create_invite('00000000-0000-0000-0000-0000000000a1', 'newclient@acme.com')),
  null, 'admin create_invite returns a token');
select is(
  (select count(*)::int from public.invites where org_id = '00000000-0000-0000-0000-0000000000a1'),
  1, 'invite row created');
select lives_ok(
  $$select public.reject_profile('00000000-0000-0000-0000-0000000000a2')$$,
  'admin can reject a profile');
select is(
  (select status::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  'rejected', 'profile becomes rejected');

select * from finish();
rollback;
