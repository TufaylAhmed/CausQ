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

-- profiles auto-created pending via trigger; configure as superuser (no JWT).
set local "request.jwt.claims" to '{}';
update public.profiles set name = 'Amy', status = 'active' where id = '00000000-0000-0000-0000-0000000000a2';
update public.profiles set name = 'Gil', status = 'active' where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set name = 'Pat', status = 'pending' where id = '00000000-0000-0000-0000-0000000000c2';
update public.profiles set name = 'Sam', role = 'staff', status = 'active', org_id = null where id = '00000000-0000-0000-0000-0000000000d2';

insert into public.engagements (id, org_id, title, lead_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'Acme build', '00000000-0000-0000-0000-0000000000d2');

-- Sam (staff) posts a message: should notify active Acme clients only.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select lives_ok(
  $$select public.post_message('00000000-0000-0000-0000-0000000000e1', 'Update from CausQ')$$,
  'staff posts a message'
);

-- Inspect rows as superuser (RLS bypassed).
reset role;
select is(
  (select count(*)::int from public.notifications where type = 'message'),
  1, 'exactly one message notification created'
);
select is(
  (select count(*)::int from public.notifications where profile_id = '00000000-0000-0000-0000-0000000000a2'),
  1, 'active Acme client (Amy) is notified'
);
select is(
  (select count(*)::int from public.notifications where profile_id = '00000000-0000-0000-0000-0000000000b2'),
  0, 'other-org client (Gil) is not notified'
);
select is(
  (select count(*)::int from public.notifications where profile_id = '00000000-0000-0000-0000-0000000000c2'),
  0, 'pending Acme client (Pat) is not notified'
);

-- Globex client cannot read Acme notifications.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(
  (select count(*)::int from public.notifications),
  0, 'Globex client sees no Acme notifications'
);

-- Pending Acme user sees nothing.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is(
  (select count(*)::int from public.notifications),
  0, 'pending user sees no notifications'
);

-- Amy sees her unread, marks it read, count goes to zero.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is(
  (select public.unread_notification_count()),
  1, 'Amy has one unread notification'
);
select is(
  (select public.mark_all_notifications_read()),
  1, 'Amy marks all read: one row updated'
);
select is(
  (select public.unread_notification_count()),
  0, 'Amy has zero unread after marking read'
);

select * from finish();
rollback;
