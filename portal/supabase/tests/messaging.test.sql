begin;
select plan(6);

insert into public.orgs (id, name, verified_domains) values
  ('00000000-0000-0000-0000-0000000000a1', 'Acme', '{acme.com}'),
  ('00000000-0000-0000-0000-0000000000b1', 'Globex', '{globex.com}');

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'amy@acme.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'gil@globex.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'sam@causq.com');

-- profiles auto-created pending via trigger; configure as superuser (no JWT).
set local "request.jwt.claims" to '{}';
update public.profiles set name = 'Amy', status = 'active' where id = '00000000-0000-0000-0000-0000000000a2';
update public.profiles set name = 'Gil', status = 'active' where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set name = 'Sam', role = 'staff', status = 'active', org_id = null where id = '00000000-0000-0000-0000-0000000000c2';

insert into public.engagements (id, org_id, title) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'Acme engagement');

-- Amy (Acme client) posts and reads.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$select public.post_message('00000000-0000-0000-0000-0000000000e1', 'Hello from Acme')$$,
  'client posts to own engagement'
);
select is((select count(*)::int from public.engagement_messages('00000000-0000-0000-0000-0000000000e1')),
          1, 'client sees the message');
select is((select author_name from public.engagement_messages('00000000-0000-0000-0000-0000000000e1') limit 1),
          'Amy', 'author name is joined');

-- Gil (other org) is forbidden.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok(
  $$select public.post_message('00000000-0000-0000-0000-0000000000e1', 'sneaky')$$,
  'forbidden', 'other-org client cannot post'
);
select throws_ok(
  $$select * from public.engagement_messages('00000000-0000-0000-0000-0000000000e1')$$,
  'forbidden', 'other-org client cannot read'
);

-- Sam (staff, no org) can post.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select lives_ok(
  $$select public.post_message('00000000-0000-0000-0000-0000000000e1', 'Hi from CausQ')$$,
  'staff posts to any engagement'
);

select * from finish();
rollback;
