alter table public.task_categories
add column if not exists default_item_kind text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'task_categories_default_item_kind_check'
      and conrelid = 'public.task_categories'::regclass
  ) then
    alter table public.task_categories
      add constraint task_categories_default_item_kind_check
      check (default_item_kind is null or default_item_kind in ('activity', 'mission', 'leisure'));
  end if;
end;
$$;

alter table public.template_tasks
add column if not exists item_kind text;

alter table public.template_tasks
add column if not exists item_subkind text;

update public.template_tasks task
set item_kind = coalesce(
  task.item_kind,
  category.default_item_kind,
  case
    when lower(coalesce(category.color_key, '')) like '%loisir%' then 'leisure'
    when lower(coalesce(category.color_key, '')) like '%sport%' then 'activity'
    when lower(coalesce(category.color_key, '')) like '%ecole%' then 'mission'
    when lower(coalesce(category.name, '')) like any (array['%jeu%', '%film%', '%video%', '%loisir%', '%tv%', '%dessin%'])
      or lower(coalesce(task.title, '')) like any (array['%jeu%', '%film%', '%video%', '%loisir%', '%tv%', '%dessin%'])
      then 'leisure'
    when lower(coalesce(category.name, '')) like any (array['%boxe%', '%sport%', '%club%', '%danse%', '%musique%', '%activite%'])
      or lower(coalesce(task.title, '')) like any (array['%boxe%', '%sport%', '%club%', '%danse%', '%musique%', '%activite%'])
      then 'activity'
    else 'mission'
  end
)
from public.task_categories category
where category.id = task.category_id
  and task.item_kind is null;

update public.template_tasks
set item_kind = 'mission'
where item_kind is null;

alter table public.template_tasks
alter column item_kind set default 'mission';

alter table public.template_tasks
alter column item_kind set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'template_tasks_item_kind_check'
      and conrelid = 'public.template_tasks'::regclass
  ) then
    alter table public.template_tasks
      add constraint template_tasks_item_kind_check
      check (item_kind in ('activity', 'mission', 'leisure'));
  end if;
end;
$$;

alter table public.task_instances
add column if not exists item_kind text;

alter table public.task_instances
add column if not exists item_subkind text;

update public.task_instances instance
set item_kind = coalesce(instance.item_kind, task.item_kind, category.default_item_kind, 'mission'),
    item_subkind = coalesce(instance.item_subkind, task.item_subkind)
from public.template_tasks task
left join public.task_categories category on category.id = task.category_id
where task.id = instance.template_task_id
  and (instance.item_kind is null or instance.item_subkind is null);

update public.task_instances
set item_kind = 'mission'
where item_kind is null;

alter table public.task_instances
alter column item_kind set default 'mission';

alter table public.task_instances
alter column item_kind set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'task_instances_item_kind_check'
      and conrelid = 'public.task_instances'::regclass
  ) then
    alter table public.task_instances
      add constraint task_instances_item_kind_check
      check (item_kind in ('activity', 'mission', 'leisure'));
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'day_template_blocks_block_type_check'
      and conrelid = 'public.day_template_blocks'::regclass
  ) then
    alter table public.day_template_blocks
      drop constraint day_template_blocks_block_type_check;
  end if;

  alter table public.day_template_blocks
    add constraint day_template_blocks_block_type_check
    check (block_type in ('school', 'home', 'transport', 'club', 'daycare', 'free_time', 'other'));
end;
$$;

create index if not exists task_categories_default_item_kind_idx
  on public.task_categories (family_id, default_item_kind);

create index if not exists template_tasks_template_kind_time_idx
  on public.template_tasks (template_id, item_kind, start_time, sort_order);

create index if not exists task_instances_family_child_date_kind_idx
  on public.task_instances (family_id, child_profile_id, date, item_kind, start_time);
