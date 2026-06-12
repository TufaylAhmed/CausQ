begin;
select plan(11);

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

insert into public.engagements (id, org_id, title, progress) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'Acme build', 50),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000b1', 'Globex build', 10);

-- 4 milestones, 2 done -> 50% completion.
insert into public.milestones (engagement_id, title, status) values
  ('00000000-0000-0000-0000-0000000000e1', 'M1', 'done'),
  ('00000000-0000-0000-0000-0000000000e1', 'M2', 'done'),
  ('00000000-0000-0000-0000-0000000000e1', 'M3', 'todo'),
  ('00000000-0000-0000-0000-0000000000e1', 'M4', 'todo');

-- 2 tasks, 1 overdue -> health = 50 - 10 = 40.
insert into public.tasks (engagement_id, title, status, due_date) values
  ('00000000-0000-0000-0000-0000000000e1', 'Overdue task', 'todo', current_date - 5),
  ('00000000-0000-0000-0000-0000000000e1', 'Future task', 'todo', current_date + 5);

-- Acme client view.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from public.tasks), 2, 'Acme client sees both Acme tasks');
select is(
  (select health from public.engagement_health where engagement_id = '00000000-0000-0000-0000-0000000000e1'),
  40, 'health = 50% milestones minus 10 overdue penalty'
);
select is(
  (select milestones_total from public.engagement_health where engagement_id = '00000000-0000-0000-0000-0000000000e1'),
  4, 'health view reports 4 milestones'
);

-- Globex client isolation.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(
  (select count(*)::int from public.tasks where engagement_id = '00000000-0000-0000-0000-0000000000e1'),
  0, 'Globex client cannot read Acme tasks'
);
select is(
  (select count(*)::int from public.engagement_health where engagement_id = '00000000-0000-0000-0000-0000000000e1'),
  0, 'Globex client cannot see Acme health row'
);

-- Pending user.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from public.tasks), 0, 'pending user sees no tasks');

-- Write rules.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$insert into public.tasks (engagement_id, title) values ('00000000-0000-0000-0000-0000000000e1', 'sneaky')$$,
  '42501', NULL, 'client cannot insert tasks'
);
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select lives_ok(
  $$insert into public.tasks (engagement_id, title) values ('00000000-0000-0000-0000-0000000000e1', 'staff task')$$,
  'staff can insert tasks'
);

-- Client document recording.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$select public.record_client_document('00000000-0000-0000-0000-0000000000e1'::uuid, 'brief.pdf', '00000000-0000-0000-0000-0000000000a1/projects/00000000-0000-0000-0000-0000000000e1/client-uploads/brief.pdf', 2048)$$,
  'Acme client records a document under a valid path'
);

set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok(
  $$select public.record_client_document('00000000-0000-0000-0000-0000000000e1'::uuid, 'x.pdf', '00000000-0000-0000-0000-0000000000a1/projects/00000000-0000-0000-0000-0000000000e1/client-uploads/x.pdf', 10)$$,
  'forbidden', 'other-org client cannot record into Acme engagement'
);

set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$select public.record_client_document('00000000-0000-0000-0000-0000000000e1'::uuid, 'x.pdf', 'wrong/path/x.pdf', 10)$$,
  'invalid path', 'a path outside the org client-uploads area is rejected'
);

select * from finish();
rollback;
