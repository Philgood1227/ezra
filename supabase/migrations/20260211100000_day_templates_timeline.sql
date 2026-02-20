create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  icon text not null,
  color_key text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.day_templates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  weekday int not null check (weekday between 0 and 6),
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.day_templates (id) on delete cascade,
  category_id uuid not null references public.task_categories (id),
  title text not null,
  description text,
  start_time time not null,
  end_time time not null,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  check (end_time > start_time)
);

create unique index if not exists day_templates_default_weekday_idx
  on public.day_templates (family_id, weekday)
  where is_default = true;

create index if not exists day_templates_family_weekday_idx
  on public.day_templates (family_id, weekday);

create index if not exists task_categories_family_idx
  on public.task_categories (family_id);

create index if not exists template_tasks_template_sort_idx
  on public.template_tasks (template_id, sort_order);

alter table public.task_categories enable row level security;
alter table public.day_templates enable row level security;
alter table public.template_tasks enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select on table public.task_categories to authenticated;
grant select on table public.day_templates to authenticated;
grant select on table public.template_tasks to authenticated;
grant insert, update, delete on table public.task_categories to authenticated;
grant insert, update, delete on table public.day_templates to authenticated;
grant insert, update, delete on table public.template_tasks to authenticated;
grant all on table public.task_categories to service_role;
grant all on table public.day_templates to service_role;
grant all on table public.template_tasks to service_role;

drop policy if exists "task_categories_select_same_family" on public.task_categories;
drop policy if exists "task_categories_insert_parent_only" on public.task_categories;
drop policy if exists "task_categories_update_parent_only" on public.task_categories;
drop policy if exists "task_categories_delete_parent_only" on public.task_categories;

create policy "task_categories_select_same_family"
on public.task_categories
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_categories.family_id
  )
);

create policy "task_categories_insert_parent_only"
on public.task_categories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_categories.family_id
      and member.role = 'parent'
  )
);

create policy "task_categories_update_parent_only"
on public.task_categories
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_categories.family_id
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_categories.family_id
      and member.role = 'parent'
  )
);

create policy "task_categories_delete_parent_only"
on public.task_categories
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = task_categories.family_id
      and member.role = 'parent'
  )
);

drop policy if exists "day_templates_select_same_family" on public.day_templates;
drop policy if exists "day_templates_insert_parent_only" on public.day_templates;
drop policy if exists "day_templates_update_parent_only" on public.day_templates;
drop policy if exists "day_templates_delete_parent_only" on public.day_templates;

create policy "day_templates_select_same_family"
on public.day_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = day_templates.family_id
  )
);

create policy "day_templates_insert_parent_only"
on public.day_templates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = day_templates.family_id
      and member.role = 'parent'
  )
);

create policy "day_templates_update_parent_only"
on public.day_templates
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = day_templates.family_id
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = day_templates.family_id
      and member.role = 'parent'
  )
);

create policy "day_templates_delete_parent_only"
on public.day_templates
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = day_templates.family_id
      and member.role = 'parent'
  )
);

drop policy if exists "template_tasks_select_same_family" on public.template_tasks;
drop policy if exists "template_tasks_insert_parent_only" on public.template_tasks;
drop policy if exists "template_tasks_update_parent_only" on public.template_tasks;
drop policy if exists "template_tasks_delete_parent_only" on public.template_tasks;

create policy "template_tasks_select_same_family"
on public.template_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.day_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = template_tasks.template_id
      and member.id = auth.uid()
  )
);

create policy "template_tasks_insert_parent_only"
on public.template_tasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.day_templates template
    join public.profiles member on member.family_id = template.family_id
    join public.task_categories category
      on category.id = template_tasks.category_id
     and category.family_id = template.family_id
    where template.id = template_tasks.template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);

create policy "template_tasks_update_parent_only"
on public.template_tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.day_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = template_tasks.template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.day_templates template
    join public.profiles member on member.family_id = template.family_id
    join public.task_categories category
      on category.id = template_tasks.category_id
     and category.family_id = template.family_id
    where template.id = template_tasks.template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);

create policy "template_tasks_delete_parent_only"
on public.template_tasks
for delete
to authenticated
using (
  exists (
    select 1
    from public.day_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = template_tasks.template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);
