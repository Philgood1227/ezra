alter table public.task_categories
  add column if not exists code text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'task_categories_code_check'
      and conrelid = 'public.task_categories'::regclass
  ) then
    alter table public.task_categories
      drop constraint task_categories_code_check;
  end if;
end;
$$;

update public.task_categories
set code = lower(trim(code))
where code is not null;

update public.task_categories
set code = case
  when code in ('homework', 'revision', 'training', 'activity', 'routine', 'leisure') then code
  when code = 'school' then 'homework'
  when code = 'social' then 'activity'
  when code = 'health' then 'routine'
  when lower(coalesce(name, '')) similar to '%(training|entrainement|drill)%' then 'training'
  when lower(coalesce(name, '')) similar to '%(revision|revisions|fiche|fiches)%' then 'revision'
  when lower(coalesce(name, '')) similar to '%(devoir|devoirs|homework|ecole|scolaire|school)%' then 'homework'
  when lower(coalesce(name, '')) similar to '%(sport|musique|activite|activites|atelier|sortie|rendez|social)%' then 'activity'
  when lower(coalesce(name, '')) similar to '%(routine|quotidien|repas|hygiene|sommeil|sante|calme|organisation)%' then 'routine'
  when lower(coalesce(name, '')) similar to '%(loisir|loisirs|jeu|jeux|film|dessin|dehors|detente|ecran)%' then 'leisure'
  when lower(coalesce(icon, '')) in ('sport', 'training') then 'training'
  when lower(coalesce(icon, '')) in ('homework', 'school') then 'homework'
  when lower(coalesce(icon, '')) in ('knowledge') then 'revision'
  when lower(coalesce(icon, '')) in ('activity', 'social', 'transport') then 'activity'
  when lower(coalesce(icon, '')) in ('routine', 'meal', 'health', 'hygiene', 'sleep', 'calm', 'checklist') then 'routine'
  when lower(coalesce(icon, '')) in ('leisure') then 'leisure'
  when lower(coalesce(color_key, '')) in ('category-routine', 'category-repas', 'category-sommeil') then 'routine'
  when lower(coalesce(color_key, '')) = 'category-loisir' then 'leisure'
  when lower(coalesce(color_key, '')) = 'category-ecole' then 'homework'
  when lower(coalesce(color_key, '')) = 'category-calme' then 'revision'
  when lower(coalesce(color_key, '')) = 'category-sport' then 'activity'
  when default_item_kind = 'leisure' then 'leisure'
  when default_item_kind = 'activity' then 'activity'
  else 'homework'
end;

with families as (
  select distinct family_id
  from public.task_categories
  union
  select distinct family_id
  from public.day_templates
),
missing as (
  select families.family_id
  from families
  left join public.task_categories category
    on category.family_id = families.family_id
   and category.code = 'training'
  where category.id is null
)
insert into public.task_categories (
  id,
  family_id,
  code,
  name,
  icon,
  color_key,
  default_item_kind,
  created_at
)
select
  gen_random_uuid(),
  missing.family_id,
  'training',
  'Entrainement',
  'sport',
  'category-sport',
  'mission',
  timezone('utc', now())
from missing;

update public.task_categories
set
  name = 'Entrainement',
  icon = 'sport',
  color_key = 'category-sport',
  default_item_kind = 'mission'
where code = 'training';

with ranked as (
  select
    id,
    family_id,
    code,
    row_number() over (partition by family_id, code order by created_at, id) as rank,
    first_value(id) over (partition by family_id, code order by created_at, id) as keeper_id
  from public.task_categories
)
update public.template_tasks task
set category_id = ranked.keeper_id
from ranked
where task.category_id = ranked.id
  and ranked.rank > 1;

with ranked as (
  select
    id,
    row_number() over (partition by family_id, code order by created_at, id) as rank
  from public.task_categories
)
delete from public.task_categories category
using ranked
where category.id = ranked.id
  and ranked.rank > 1;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'task_categories_code_check'
      and conrelid = 'public.task_categories'::regclass
  ) then
    alter table public.task_categories
      drop constraint task_categories_code_check;
  end if;

  alter table public.task_categories
    add constraint task_categories_code_check
    check (code in ('homework', 'revision', 'training', 'activity', 'routine', 'leisure'));
end;
$$;
