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
