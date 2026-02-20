alter table public.profiles enable row level security;

grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.family_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_parent_in_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = target_family_id
      and p.role = 'parent'
  );
$$;

revoke all on function public.current_family_id() from public;
revoke all on function public.is_parent_in_family(uuid) from public;
grant execute on function public.current_family_id() to authenticated;
grant execute on function public.is_parent_in_family(uuid) to authenticated;

drop policy if exists "profiles_select_same_family" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "Select own profile" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self_or_parent" on public.profiles;
drop policy if exists "profiles_delete_parent_only" on public.profiles;

create policy "profiles_select_same_family"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or family_id = public.current_family_id()
);

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_self_or_parent"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_parent_in_family(family_id)
)
with check (
  id = auth.uid()
  or public.is_parent_in_family(family_id)
);

create policy "profiles_delete_parent_only"
on public.profiles
for delete
to authenticated
using (public.is_parent_in_family(family_id));
