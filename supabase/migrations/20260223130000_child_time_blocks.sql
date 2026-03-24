alter table public.day_template_blocks
add column if not exists child_time_block_id text;

alter table public.template_tasks
add column if not exists recommended_child_time_block_id text;

update public.day_template_blocks
set child_time_block_id = null
where child_time_block_id is not null
  and child_time_block_id not in ('morning', 'noon', 'afternoon', 'home', 'evening');

update public.template_tasks
set recommended_child_time_block_id = null
where recommended_child_time_block_id is not null
  and recommended_child_time_block_id not in ('morning', 'noon', 'afternoon', 'home', 'evening');

with mapped_blocks as (
  select
    id,
    case
      when ((extract(epoch from start_time) / 60.0) + (extract(epoch from end_time) / 60.0)) / 2.0 < 690
        then 'morning'
      when ((extract(epoch from start_time) / 60.0) + (extract(epoch from end_time) / 60.0)) / 2.0 < 810
        then 'noon'
      when ((extract(epoch from start_time) / 60.0) + (extract(epoch from end_time) / 60.0)) / 2.0 < 990
        then 'afternoon'
      when ((extract(epoch from start_time) / 60.0) + (extract(epoch from end_time) / 60.0)) / 2.0 < 1110
        then 'home'
      else 'evening'
    end as mapped_block
  from public.day_template_blocks
)
update public.day_template_blocks target
set child_time_block_id = mapped_blocks.mapped_block
from mapped_blocks
where target.id = mapped_blocks.id
  and target.child_time_block_id is null;

with mapped_tasks as (
  select
    id,
    case
      when ((extract(epoch from start_time) / 60.0) + (extract(epoch from end_time) / 60.0)) / 2.0 < 690
        then 'morning'
      when ((extract(epoch from start_time) / 60.0) + (extract(epoch from end_time) / 60.0)) / 2.0 < 810
        then 'noon'
      when ((extract(epoch from start_time) / 60.0) + (extract(epoch from end_time) / 60.0)) / 2.0 < 990
        then 'afternoon'
      when ((extract(epoch from start_time) / 60.0) + (extract(epoch from end_time) / 60.0)) / 2.0 < 1110
        then 'home'
      else 'evening'
    end as mapped_block
  from public.template_tasks
)
update public.template_tasks target
set recommended_child_time_block_id = mapped_tasks.mapped_block
from mapped_tasks
where target.id = mapped_tasks.id
  and target.recommended_child_time_block_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'day_template_blocks_child_time_block_id_check'
      and conrelid = 'public.day_template_blocks'::regclass
  ) then
    alter table public.day_template_blocks
      add constraint day_template_blocks_child_time_block_id_check
      check (
        child_time_block_id is null
        or child_time_block_id in ('morning', 'noon', 'afternoon', 'home', 'evening')
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'template_tasks_recommended_child_time_block_id_check'
      and conrelid = 'public.template_tasks'::regclass
  ) then
    alter table public.template_tasks
      add constraint template_tasks_recommended_child_time_block_id_check
      check (
        recommended_child_time_block_id is null
        or recommended_child_time_block_id in ('morning', 'noon', 'afternoon', 'home', 'evening')
      );
  end if;
end;
$$;

create index if not exists day_template_blocks_child_time_block_idx
  on public.day_template_blocks (day_template_id, child_time_block_id, start_time);

create index if not exists template_tasks_recommended_child_time_block_idx
  on public.template_tasks (template_id, recommended_child_time_block_id, start_time);
