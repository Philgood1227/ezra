alter table public.template_tasks
  add column if not exists instructions_html text;

