alter table public.template_tasks
add column if not exists assigned_profile_id uuid references public.profiles (id) on delete set null;

alter table public.task_instances
add column if not exists assigned_profile_id uuid references public.profiles (id) on delete set null;

update public.task_instances instance
set assigned_profile_id = template.assigned_profile_id
from public.template_tasks template
where template.id = instance.template_task_id
  and instance.assigned_profile_id is null
  and template.assigned_profile_id is not null;

create index if not exists template_tasks_assigned_profile_idx
  on public.template_tasks (assigned_profile_id);

create index if not exists task_instances_assigned_profile_idx
  on public.task_instances (assigned_profile_id);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('petit_dejeuner', 'dejeuner', 'diner', 'collation')),
  description text not null,
  prepared_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meal_ratings (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  rating int not null check (rating between 1 and 3),
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (meal_id)
);

create table if not exists public.emotion_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  moment text not null check (moment in ('matin', 'soir')),
  emotion text not null check (emotion in ('tres_content', 'content', 'neutre', 'triste', 'tres_triste')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (child_profile_id, date, moment)
);

create index if not exists meals_family_child_date_idx
  on public.meals (family_id, child_profile_id, date desc);

create index if not exists meals_prepared_by_idx
  on public.meals (prepared_by_profile_id);

create index if not exists meal_ratings_meal_created_idx
  on public.meal_ratings (meal_id, created_at desc);

create index if not exists emotion_logs_family_child_date_idx
  on public.emotion_logs (family_id, child_profile_id, date desc, moment);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_meals_updated_at on public.meals;
create trigger set_meals_updated_at
before update on public.meals
for each row
execute function public.set_row_updated_at();

drop trigger if exists set_meal_ratings_updated_at on public.meal_ratings;
create trigger set_meal_ratings_updated_at
before update on public.meal_ratings
for each row
execute function public.set_row_updated_at();

drop trigger if exists set_emotion_logs_updated_at on public.emotion_logs;
create trigger set_emotion_logs_updated_at
before update on public.emotion_logs
for each row
execute function public.set_row_updated_at();

alter table public.meals enable row level security;
alter table public.meal_ratings enable row level security;
alter table public.emotion_logs enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.meals to authenticated;
grant select, insert, update, delete on table public.meal_ratings to authenticated;
grant select, insert, update, delete on table public.emotion_logs to authenticated;
grant all on table public.meals to service_role;
grant all on table public.meal_ratings to service_role;
grant all on table public.emotion_logs to service_role;

drop policy if exists "meals_select_family" on public.meals;
drop policy if exists "meals_insert_parent_only" on public.meals;
drop policy if exists "meals_update_parent_only" on public.meals;
drop policy if exists "meals_delete_parent_only" on public.meals;

create policy "meals_select_family"
on public.meals
for select
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or child_profile_id = auth.uid()
  )
);

create policy "meals_insert_parent_only"
on public.meals
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
  and exists (
    select 1
    from public.profiles child
    where child.id = meals.child_profile_id
      and child.family_id = meals.family_id
      and child.role = 'child'
  )
  and (
    meals.prepared_by_profile_id is null
    or exists (
      select 1
      from public.profiles preparer
      where preparer.id = meals.prepared_by_profile_id
        and preparer.family_id = meals.family_id
    )
  )
);

create policy "meals_update_parent_only"
on public.meals
for update
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
)
with check (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
  and exists (
    select 1
    from public.profiles child
    where child.id = meals.child_profile_id
      and child.family_id = meals.family_id
      and child.role = 'child'
  )
  and (
    meals.prepared_by_profile_id is null
    or exists (
      select 1
      from public.profiles preparer
      where preparer.id = meals.prepared_by_profile_id
        and preparer.family_id = meals.family_id
    )
  )
);

create policy "meals_delete_parent_only"
on public.meals
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

drop policy if exists "meal_ratings_select_family" on public.meal_ratings;
drop policy if exists "meal_ratings_insert_child_only" on public.meal_ratings;
drop policy if exists "meal_ratings_update_family" on public.meal_ratings;
drop policy if exists "meal_ratings_delete_family" on public.meal_ratings;

create policy "meal_ratings_select_family"
on public.meal_ratings
for select
to authenticated
using (
  exists (
    select 1
    from public.meals meal
    join public.profiles member on member.id = auth.uid()
    where meal.id = meal_ratings.meal_id
      and member.family_id = meal.family_id
      and (
        member.role = 'parent'
        or member.id = meal.child_profile_id
      )
  )
);

create policy "meal_ratings_insert_child_only"
on public.meal_ratings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.meals meal
    join public.profiles member on member.id = auth.uid()
    where meal.id = meal_ratings.meal_id
      and member.family_id = meal.family_id
      and member.role = 'child'
      and member.id = meal.child_profile_id
  )
);

create policy "meal_ratings_update_family"
on public.meal_ratings
for update
to authenticated
using (
  exists (
    select 1
    from public.meals meal
    join public.profiles member on member.id = auth.uid()
    where meal.id = meal_ratings.meal_id
      and member.family_id = meal.family_id
      and (
        member.role = 'parent'
        or member.id = meal.child_profile_id
      )
  )
)
with check (
  exists (
    select 1
    from public.meals meal
    join public.profiles member on member.id = auth.uid()
    where meal.id = meal_ratings.meal_id
      and member.family_id = meal.family_id
      and (
        member.role = 'parent'
        or member.id = meal.child_profile_id
      )
  )
);

create policy "meal_ratings_delete_family"
on public.meal_ratings
for delete
to authenticated
using (
  exists (
    select 1
    from public.meals meal
    join public.profiles member on member.id = auth.uid()
    where meal.id = meal_ratings.meal_id
      and member.family_id = meal.family_id
      and (
        member.role = 'parent'
        or member.id = meal.child_profile_id
      )
  )
);

drop policy if exists "emotion_logs_select_family" on public.emotion_logs;
drop policy if exists "emotion_logs_insert_child_self" on public.emotion_logs;
drop policy if exists "emotion_logs_update_child_self" on public.emotion_logs;
drop policy if exists "emotion_logs_delete_parent_only" on public.emotion_logs;

create policy "emotion_logs_select_family"
on public.emotion_logs
for select
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or child_profile_id = auth.uid()
  )
);

create policy "emotion_logs_insert_child_self"
on public.emotion_logs
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and child_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles child
    where child.id = emotion_logs.child_profile_id
      and child.family_id = emotion_logs.family_id
      and child.role = 'child'
  )
);

create policy "emotion_logs_update_child_self"
on public.emotion_logs
for update
to authenticated
using (
  family_id = public.current_family_id()
  and child_profile_id = auth.uid()
)
with check (
  family_id = public.current_family_id()
  and child_profile_id = auth.uid()
);

create policy "emotion_logs_delete_parent_only"
on public.emotion_logs
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);
