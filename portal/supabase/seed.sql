-- Local-only dev seed (runs on `supabase db reset`, never on production).
insert into public.orgs (id, name, verified_domains)
values ('11111111-1111-1111-1111-111111111111', 'Demo Client', '{demo.test}')
on conflict (id) do nothing;

insert into public.engagements (id, org_id, title, summary, status, progress)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'Quantum readiness assessment',
        'Crypto-agility baseline and roadmap.',
        'active', 60)
on conflict (id) do nothing;

insert into public.milestones (id, engagement_id, title, status, sort) values
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 'Discovery & inventory', 'done', 10),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'Crypto-agility gap analysis', 'in_progress', 20),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Roadmap & handover', 'todo', 30)
on conflict (id) do nothing;

insert into public.documents (id, org_id, engagement_id, filename, storage_path, size_bytes) values
  ('44444444-4444-4444-4444-444444444444',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'Quantum-readiness-summary.txt',
   '11111111-1111-1111-1111-111111111111/Quantum-readiness-summary.txt',
   42)
on conflict (id) do nothing;
