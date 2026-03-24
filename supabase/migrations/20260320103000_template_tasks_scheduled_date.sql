alter table public.template_tasks
  add column if not exists scheduled_date date;

create index if not exists template_tasks_template_scheduled_date_idx
  on public.template_tasks (template_id, scheduled_date);
