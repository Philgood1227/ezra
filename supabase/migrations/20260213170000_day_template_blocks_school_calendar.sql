create table if not exists public.day_template_blocks (
  id uuid primary key default gen_random_uuid(),
  day_template_id uuid not null references public.day_templates (id) on delete cascade,
  block_type text not null check (block_type in ('school', 'daycare', 'free_time', 'other')),
  label text,
  start_time time not null,
  end_time time not null,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_time > start_time)
);

create table if not exists public.school_periods (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  period_type text not null check (period_type in ('vacances', 'jour_special')),
  start_date date not null,
  end_date date not null,
  label text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_date >= start_date)
);

create index if not exists day_template_blocks_template_time_idx
  on public.day_template_blocks (day_template_id, start_time, sort_order);

create index if not exists school_periods_family_dates_idx
  on public.school_periods (family_id, start_date, end_date);

alter table public.day_template_blocks enable row level security;
alter table public.school_periods enable row level security;

grant select on table public.day_template_blocks to authenticated;
grant insert, update, delete on table public.day_template_blocks to authenticated;
grant all on table public.day_template_blocks to service_role;

grant select on table public.school_periods to authenticated;
grant insert, update, delete on table public.school_periods to authenticated;
grant all on table public.school_periods to service_role;

drop policy if exists "day_template_blocks_select_same_family" on public.day_template_blocks;
drop policy if exists "day_template_blocks_insert_parent_only" on public.day_template_blocks;
drop policy if exists "day_template_blocks_update_parent_only" on public.day_template_blocks;
drop policy if exists "day_template_blocks_delete_parent_only" on public.day_template_blocks;

create policy "day_template_blocks_select_same_family"
on public.day_template_blocks
for select
to authenticated
using (
  exists (
    select 1
    from public.day_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = day_template_blocks.day_template_id
      and member.id = auth.uid()
  )
);

create policy "day_template_blocks_insert_parent_only"
on public.day_template_blocks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.day_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = day_template_blocks.day_template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);

create policy "day_template_blocks_update_parent_only"
on public.day_template_blocks
for update
to authenticated
using (
  exists (
    select 1
    from public.day_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = day_template_blocks.day_template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.day_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = day_template_blocks.day_template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);

create policy "day_template_blocks_delete_parent_only"
on public.day_template_blocks
for delete
to authenticated
using (
  exists (
    select 1
    from public.day_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = day_template_blocks.day_template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);

drop policy if exists "school_periods_select_same_family" on public.school_periods;
drop policy if exists "school_periods_insert_parent_only" on public.school_periods;
drop policy if exists "school_periods_update_parent_only" on public.school_periods;
drop policy if exists "school_periods_delete_parent_only" on public.school_periods;

create policy "school_periods_select_same_family"
on public.school_periods
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = school_periods.family_id
  )
);

create policy "school_periods_insert_parent_only"
on public.school_periods
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = school_periods.family_id
      and member.role = 'parent'
  )
);

create policy "school_periods_update_parent_only"
on public.school_periods
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = school_periods.family_id
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = school_periods.family_id
      and member.role = 'parent'
  )
);

create policy "school_periods_delete_parent_only"
on public.school_periods
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = school_periods.family_id
      and member.role = 'parent'
  )
);

drop trigger if exists set_day_template_blocks_updated_at on public.day_template_blocks;
create trigger set_day_template_blocks_updated_at
before update on public.day_template_blocks
for each row
execute function public.set_row_updated_at();

drop trigger if exists set_school_periods_updated_at on public.school_periods;
create trigger set_school_periods_updated_at
before update on public.school_periods
for each row
execute function public.set_row_updated_at();

create temporary table tmp_school_template_tasks on commit drop as
select
  task.id,
  task.template_id,
  task.title,
  task.start_time,
  task.end_time,
  task.sort_order
from public.template_tasks task
join public.task_categories category on category.id = task.category_id
where lower(category.name) in ('ecole', 'école')
   or task.title ilike 'ecole%'
   or task.title ilike 'école%';

with ranked as (
  select
    source.*,
    row_number() over (
      partition by source.template_id, source.start_time, source.end_time
      order by source.sort_order, source.id
    ) as duplicate_rank,
    row_number() over (
      partition by source.template_id
      order by source.start_time, source.end_time, source.sort_order, source.id
    ) - 1 as block_order
  from tmp_school_template_tasks source
)
insert into public.day_template_blocks (
  day_template_id,
  block_type,
  label,
  start_time,
  end_time,
  sort_order
)
select
  ranked.template_id,
  'school',
  nullif(trim(ranked.title), ''),
  ranked.start_time,
  ranked.end_time,
  ranked.block_order
from ranked
where ranked.duplicate_rank = 1
  and not exists (
    select 1
    from public.day_template_blocks existing
    where existing.day_template_id = ranked.template_id
      and existing.block_type = 'school'
      and existing.start_time = ranked.start_time
      and existing.end_time = ranked.end_time
  );

delete from public.task_instances
where template_task_id in (select id from tmp_school_template_tasks);

delete from public.template_tasks
where id in (select id from tmp_school_template_tasks);

with reordered as (
  select
    task.id,
    row_number() over (
      partition by task.template_id
      order by task.start_time, task.sort_order, task.id
    ) - 1 as next_sort_order
  from public.template_tasks task
)
update public.template_tasks target
set sort_order = reordered.next_sort_order
from reordered
where target.id = reordered.id
  and target.sort_order <> reordered.next_sort_order;
