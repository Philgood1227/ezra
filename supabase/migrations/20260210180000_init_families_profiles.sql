create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_role') then
    create type public.profile_role as enum ('parent', 'child', 'viewer');
  end if;
end $$;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null,
  role public.profile_role not null,
  avatar_url text,
  pin_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_family_id_idx on public.profiles (family_id);
create index if not exists profiles_family_role_idx on public.profiles (family_id, role);

alter table public.families enable row level security;
alter table public.profiles enable row level security;

create policy "families_select_same_family"
on public.families
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = families.id
  )
);

create policy "families_insert_authenticated"
on public.families
for insert
to authenticated
with check (auth.uid() is not null);

create policy "families_update_parent_only"
on public.families
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = families.id
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = families.id
      and member.role = 'parent'
  )
);

create policy "profiles_select_same_family"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = profiles.family_id
  )
);

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and not exists (
    select 1
    from public.profiles existing
    where existing.id = auth.uid()
  )
);

create policy "profiles_update_self_or_parent"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = profiles.family_id
      and member.role = 'parent'
  )
)
with check (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = profiles.family_id
      and member.role = 'parent'
  )
);

create policy "profiles_delete_parent_only"
on public.profiles
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = profiles.family_id
      and member.role = 'parent'
  )
);

create or replace function public.bootstrap_parent_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  role_metadata text;
  display_name_value text;
  family_name_value text;
begin
  role_metadata := coalesce(new.raw_user_meta_data ->> 'role', 'parent');

  if role_metadata <> 'parent' then
    return new;
  end if;

  display_name_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'Parent'
  );

  family_name_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'family_name', ''),
    display_name_value || ' Family'
  );

  insert into public.families (name)
  values (family_name_value)
  returning id into new_family_id;

  insert into public.profiles (id, family_id, display_name, role)
  values (new.id, new_family_id, display_name_value, 'parent')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.bootstrap_parent_profile();
