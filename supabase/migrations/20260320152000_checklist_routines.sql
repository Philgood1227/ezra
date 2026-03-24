alter table public.checklist_templates
  add column if not exists recurrence_rule text not null default 'none',
  add column if not exists recurrence_days smallint[] not null default '{}',
  add column if not exists recurrence_start_date date,
  add column if not exists recurrence_end_date date;

alter table public.checklist_templates
  drop constraint if exists checklist_templates_type_check;

alter table public.checklist_templates
  add constraint checklist_templates_type_check
  check (type in ('piscine', 'sortie', 'evaluation', 'quotidien', 'routine', 'autre'));

alter table public.checklist_templates
  drop constraint if exists checklist_templates_recurrence_rule_check;

alter table public.checklist_templates
  add constraint checklist_templates_recurrence_rule_check
  check (recurrence_rule in ('none', 'daily', 'weekdays', 'school_days', 'weekly_days'));

alter table public.checklist_templates
  drop constraint if exists checklist_templates_recurrence_days_check;

alter table public.checklist_templates
  add constraint checklist_templates_recurrence_days_check
  check (
    recurrence_days is not null
    and recurrence_days <@ array[1,2,3,4,5,6,7]::smallint[]
  );

create index if not exists checklist_templates_recurrence_idx
  on public.checklist_templates (family_id, type, recurrence_rule);

alter table public.checklist_instances
  add column if not exists source_template_id uuid references public.checklist_templates (id) on delete cascade;

create unique index if not exists checklist_instances_child_date_source_template_unique_idx
  on public.checklist_instances (child_profile_id, date, source_template_id)
  where source_template_id is not null;

create index if not exists checklist_instances_source_template_idx
  on public.checklist_instances (source_template_id);
