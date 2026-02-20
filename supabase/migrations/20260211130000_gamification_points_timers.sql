alter table public.template_tasks
add column if not exists points_base int not null default 2;

create table if not exists public.task_instances (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  template_task_id uuid not null references public.template_tasks (id) on delete cascade,
  date date not null,
  status text not null check (status in ('a_faire', 'en_cours', 'termine', 'en_retard', 'ignore')),
  start_time time not null,
  end_time time not null,
  points_base int not null default 0,
  points_earned int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (child_profile_id, template_task_id, date)
);

create table if not exists public.reward_tiers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  label text not null,
  description text,
  points_required int not null check (points_required >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.daily_points (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  points_total int not null default 0 check (points_total >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (child_profile_id, date)
);

create index if not exists task_instances_family_child_date_idx
  on public.task_instances (family_id, child_profile_id, date);

create index if not exists task_instances_template_task_idx
  on public.task_instances (template_task_id);

create index if not exists reward_tiers_family_sort_idx
  on public.reward_tiers (family_id, sort_order, points_required);

create index if not exists daily_points_family_child_date_idx
  on public.daily_points (family_id, child_profile_id, date);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_task_instances_updated_at on public.task_instances;
create trigger set_task_instances_updated_at
before update on public.task_instances
for each row
execute function public.set_row_updated_at();

drop trigger if exists set_daily_points_updated_at on public.daily_points;
create trigger set_daily_points_updated_at
before update on public.daily_points
for each row
execute function public.set_row_updated_at();

alter table public.task_instances enable row level security;
alter table public.reward_tiers enable row level security;
alter table public.daily_points enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.task_instances to authenticated;
grant select, insert, update, delete on table public.reward_tiers to authenticated;
grant select, insert, update, delete on table public.daily_points to authenticated;
grant all on table public.task_instances to service_role;
grant all on table public.reward_tiers to service_role;
grant all on table public.daily_points to service_role;

drop policy if exists "task_instances_select_same_family" on public.task_instances;
drop policy if exists "task_instances_insert_parent_only" on public.task_instances;
drop policy if exists "task_instances_insert_child_self" on public.task_instances;
drop policy if exists "task_instances_update_parent_or_child_self" on public.task_instances;
drop policy if exists "task_instances_delete_parent_only" on public.task_instances;

create policy "task_instances_select_same_family"
on public.task_instances
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_instances.family_id
      and (
        member.role = 'parent'
        or member.id = task_instances.child_profile_id
      )
  )
);

create policy "task_instances_insert_parent_only"
on public.task_instances
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_instances.family_id
      and member.role = 'parent'
  )
);

create policy "task_instances_insert_child_self"
on public.task_instances
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_instances.family_id
      and member.role = 'child'
      and member.id = task_instances.child_profile_id
  )
);

create policy "task_instances_update_parent_or_child_self"
on public.task_instances
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_instances.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = task_instances.child_profile_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_instances.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = task_instances.child_profile_id)
      )
  )
);

create policy "task_instances_delete_parent_only"
on public.task_instances
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_instances.family_id
      and member.role = 'parent'
  )
);

drop policy if exists "reward_tiers_select_same_family" on public.reward_tiers;
drop policy if exists "reward_tiers_insert_parent_only" on public.reward_tiers;
drop policy if exists "reward_tiers_update_parent_only" on public.reward_tiers;
drop policy if exists "reward_tiers_delete_parent_only" on public.reward_tiers;

create policy "reward_tiers_select_same_family"
on public.reward_tiers
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = reward_tiers.family_id
  )
);

create policy "reward_tiers_insert_parent_only"
on public.reward_tiers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = reward_tiers.family_id
      and member.role = 'parent'
  )
);

create policy "reward_tiers_update_parent_only"
on public.reward_tiers
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = reward_tiers.family_id
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = reward_tiers.family_id
      and member.role = 'parent'
  )
);

create policy "reward_tiers_delete_parent_only"
on public.reward_tiers
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = reward_tiers.family_id
      and member.role = 'parent'
  )
);

drop policy if exists "daily_points_select_same_family" on public.daily_points;
drop policy if exists "daily_points_insert_parent_or_child_self" on public.daily_points;
drop policy if exists "daily_points_update_parent_or_child_self" on public.daily_points;
drop policy if exists "daily_points_delete_parent_only" on public.daily_points;

create policy "daily_points_select_same_family"
on public.daily_points
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = daily_points.family_id
      and (
        member.role = 'parent'
        or member.id = daily_points.child_profile_id
      )
  )
);

create policy "daily_points_insert_parent_or_child_self"
on public.daily_points
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = daily_points.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = daily_points.child_profile_id)
      )
  )
);

create policy "daily_points_update_parent_or_child_self"
on public.daily_points
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = daily_points.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = daily_points.child_profile_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = daily_points.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = daily_points.child_profile_id)
      )
  )
);

create policy "daily_points_delete_parent_only"
on public.daily_points
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = daily_points.family_id
      and member.role = 'parent'
  )
);
