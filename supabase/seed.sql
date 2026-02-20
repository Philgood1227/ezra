-- Demo credentials for local development:
-- Parent email: parent.demo@ezra.local
-- Parent password: ParentPass123!
-- Child PIN: 1234

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'parent.demo@ezra.local',
    crypt('ParentPass123!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}',
    '{"role":"child"}',
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'child.demo@ezra.local',
    crypt('ChildPass123!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}',
    '{"role":"child"}',
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do nothing;

insert into public.families (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Demo Family')
on conflict (id) do update set name = excluded.name;

insert into public.profiles (id, family_id, display_name, role, pin_hash)
values
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Demo Parent',
    'parent',
    null
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'Ezra',
    'child',
    'b8f4f62fcacd8351cde3088ca5cc6806:d38f3b1eda01ad6c3f0ebb55d4aa37edc6ff74f722aeed7d7ce41c23d97047ba364533b27e5f631f972bdc5abebbfb4d387ef23956726d51487118c6e7aba84b'
  )
on conflict (id) do update
set
  family_id = excluded.family_id,
  display_name = excluded.display_name,
  role = excluded.role,
  pin_hash = excluded.pin_hash;
