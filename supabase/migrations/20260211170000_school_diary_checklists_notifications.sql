create table if not exists public.school_diary_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('devoir', 'evaluation', 'sortie', 'piscine', 'info')),
  subject text,
  title text not null,
  description text,
  date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  type text not null check (type in ('piscine', 'sortie', 'evaluation', 'quotidien', 'autre')),
  label text not null,
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checklist_instances (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  diary_entry_id uuid references public.school_diary_entries (id) on delete cascade,
  type text not null,
  label text not null,
  date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checklist_instance_items (
  id uuid primary key default gen_random_uuid(),
  checklist_instance_id uuid not null references public.checklist_instances (id) on delete cascade,
  label text not null,
  is_checked boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('rappel_devoir', 'rappel_checklist', 'rappel_journee')),
  channel text not null check (channel in ('in_app', 'push', 'both')),
  time_of_day time not null,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('rappel_devoir', 'rappel_checklist', 'rappel_journee', 'systeme')),
  title text not null,
  message text not null,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists school_diary_entries_family_child_date_idx
  on public.school_diary_entries (family_id, child_profile_id, date);

create index if not exists checklist_templates_family_type_idx
  on public.checklist_templates (family_id, type);

create index if not exists checklist_items_template_sort_idx
  on public.checklist_items (template_id, sort_order);

create unique index if not exists checklist_instances_diary_entry_unique_idx
  on public.checklist_instances (child_profile_id, diary_entry_id)
  where diary_entry_id is not null;

create index if not exists checklist_instances_family_child_date_idx
  on public.checklist_instances (family_id, child_profile_id, date);

create index if not exists checklist_instance_items_instance_sort_idx
  on public.checklist_instance_items (checklist_instance_id, sort_order);

create index if not exists notification_rules_family_child_type_idx
  on public.notification_rules (family_id, child_profile_id, type);

create index if not exists push_subscriptions_family_child_idx
  on public.push_subscriptions (family_id, child_profile_id, profile_id);

create index if not exists in_app_notifications_family_child_created_idx
  on public.in_app_notifications (family_id, child_profile_id, created_at desc);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_school_diary_entries_updated_at on public.school_diary_entries;
create trigger set_school_diary_entries_updated_at
before update on public.school_diary_entries
for each row
execute function public.set_row_updated_at();

drop trigger if exists set_notification_rules_updated_at on public.notification_rules;
create trigger set_notification_rules_updated_at
before update on public.notification_rules
for each row
execute function public.set_row_updated_at();

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_row_updated_at();

alter table public.school_diary_entries enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_instances enable row level security;
alter table public.checklist_instance_items enable row level security;
alter table public.notification_rules enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.in_app_notifications enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.school_diary_entries to authenticated;
grant select, insert, update, delete on table public.checklist_templates to authenticated;
grant select, insert, update, delete on table public.checklist_items to authenticated;
grant select, insert, update, delete on table public.checklist_instances to authenticated;
grant select, insert, update, delete on table public.checklist_instance_items to authenticated;
grant select, insert, update, delete on table public.notification_rules to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant select, insert, update, delete on table public.in_app_notifications to authenticated;
grant all on table public.school_diary_entries to service_role;
grant all on table public.checklist_templates to service_role;
grant all on table public.checklist_items to service_role;
grant all on table public.checklist_instances to service_role;
grant all on table public.checklist_instance_items to service_role;
grant all on table public.notification_rules to service_role;
grant all on table public.push_subscriptions to service_role;
grant all on table public.in_app_notifications to service_role;

drop policy if exists "school_diary_entries_select_same_family" on public.school_diary_entries;
drop policy if exists "school_diary_entries_insert_parent_only" on public.school_diary_entries;
drop policy if exists "school_diary_entries_update_parent_only" on public.school_diary_entries;
drop policy if exists "school_diary_entries_delete_parent_only" on public.school_diary_entries;

create policy "school_diary_entries_select_same_family"
on public.school_diary_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = school_diary_entries.family_id
      and (member.role = 'parent' or member.id = school_diary_entries.child_profile_id)
  )
);

create policy "school_diary_entries_insert_parent_only"
on public.school_diary_entries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = school_diary_entries.family_id
      and member.role = 'parent'
  )
);

create policy "school_diary_entries_update_parent_only"
on public.school_diary_entries
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = school_diary_entries.family_id
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = school_diary_entries.family_id
      and member.role = 'parent'
  )
);

create policy "school_diary_entries_delete_parent_only"
on public.school_diary_entries
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = school_diary_entries.family_id
      and member.role = 'parent'
  )
);

drop policy if exists "checklist_templates_select_same_family" on public.checklist_templates;
drop policy if exists "checklist_templates_insert_parent_only" on public.checklist_templates;
drop policy if exists "checklist_templates_update_parent_only" on public.checklist_templates;
drop policy if exists "checklist_templates_delete_parent_only" on public.checklist_templates;

create policy "checklist_templates_select_same_family"
on public.checklist_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = checklist_templates.family_id
  )
);

create policy "checklist_templates_insert_parent_only"
on public.checklist_templates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = checklist_templates.family_id
      and member.role = 'parent'
  )
);

create policy "checklist_templates_update_parent_only"
on public.checklist_templates
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = checklist_templates.family_id
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = checklist_templates.family_id
      and member.role = 'parent'
  )
);

create policy "checklist_templates_delete_parent_only"
on public.checklist_templates
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = checklist_templates.family_id
      and member.role = 'parent'
  )
);

drop policy if exists "checklist_items_select_same_family" on public.checklist_items;
drop policy if exists "checklist_items_insert_parent_only" on public.checklist_items;
drop policy if exists "checklist_items_update_parent_only" on public.checklist_items;
drop policy if exists "checklist_items_delete_parent_only" on public.checklist_items;

create policy "checklist_items_select_same_family"
on public.checklist_items
for select
to authenticated
using (
  exists (
    select 1
    from public.checklist_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = checklist_items.template_id
      and member.id = auth.uid()
  )
);

create policy "checklist_items_insert_parent_only"
on public.checklist_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.checklist_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = checklist_items.template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);

create policy "checklist_items_update_parent_only"
on public.checklist_items
for update
to authenticated
using (
  exists (
    select 1
    from public.checklist_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = checklist_items.template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.checklist_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = checklist_items.template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);

create policy "checklist_items_delete_parent_only"
on public.checklist_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.checklist_templates template
    join public.profiles member on member.family_id = template.family_id
    where template.id = checklist_items.template_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);

drop policy if exists "checklist_instances_select_same_family" on public.checklist_instances;
drop policy if exists "checklist_instances_insert_parent_only" on public.checklist_instances;
drop policy if exists "checklist_instances_update_parent_only" on public.checklist_instances;
drop policy if exists "checklist_instances_delete_parent_only" on public.checklist_instances;

create policy "checklist_instances_select_same_family"
on public.checklist_instances
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = checklist_instances.family_id
      and (member.role = 'parent' or member.id = checklist_instances.child_profile_id)
  )
);

create policy "checklist_instances_insert_parent_only"
on public.checklist_instances
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = checklist_instances.family_id
      and member.role = 'parent'
  )
);

create policy "checklist_instances_update_parent_only"
on public.checklist_instances
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = checklist_instances.family_id
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = checklist_instances.family_id
      and member.role = 'parent'
  )
);

create policy "checklist_instances_delete_parent_only"
on public.checklist_instances
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = checklist_instances.family_id
      and member.role = 'parent'
  )
);

drop policy if exists "checklist_instance_items_select_same_family" on public.checklist_instance_items;
drop policy if exists "checklist_instance_items_insert_parent_only" on public.checklist_instance_items;
drop policy if exists "checklist_instance_items_update_family" on public.checklist_instance_items;
drop policy if exists "checklist_instance_items_delete_parent_only" on public.checklist_instance_items;

create policy "checklist_instance_items_select_same_family"
on public.checklist_instance_items
for select
to authenticated
using (
  exists (
    select 1
    from public.checklist_instances instance
    join public.profiles member on member.family_id = instance.family_id
    where instance.id = checklist_instance_items.checklist_instance_id
      and member.id = auth.uid()
      and (member.role = 'parent' or member.id = instance.child_profile_id)
  )
);

create policy "checklist_instance_items_insert_parent_only"
on public.checklist_instance_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.checklist_instances instance
    join public.profiles member on member.family_id = instance.family_id
    where instance.id = checklist_instance_items.checklist_instance_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);

create policy "checklist_instance_items_update_family"
on public.checklist_instance_items
for update
to authenticated
using (
  exists (
    select 1
    from public.checklist_instances instance
    join public.profiles member on member.family_id = instance.family_id
    where instance.id = checklist_instance_items.checklist_instance_id
      and member.id = auth.uid()
      and (member.role = 'parent' or member.id = instance.child_profile_id)
  )
)
with check (
  exists (
    select 1
    from public.checklist_instances instance
    join public.profiles member on member.family_id = instance.family_id
    where instance.id = checklist_instance_items.checklist_instance_id
      and member.id = auth.uid()
      and (member.role = 'parent' or member.id = instance.child_profile_id)
  )
);

create policy "checklist_instance_items_delete_parent_only"
on public.checklist_instance_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.checklist_instances instance
    join public.profiles member on member.family_id = instance.family_id
    where instance.id = checklist_instance_items.checklist_instance_id
      and member.id = auth.uid()
      and member.role = 'parent'
  )
);

drop policy if exists "notification_rules_select_parent_only" on public.notification_rules;
drop policy if exists "notification_rules_insert_parent_only" on public.notification_rules;
drop policy if exists "notification_rules_update_parent_only" on public.notification_rules;
drop policy if exists "notification_rules_delete_parent_only" on public.notification_rules;

create policy "notification_rules_select_parent_only"
on public.notification_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = notification_rules.family_id
      and member.role = 'parent'
  )
);

create policy "notification_rules_insert_parent_only"
on public.notification_rules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = notification_rules.family_id
      and member.role = 'parent'
  )
);

create policy "notification_rules_update_parent_only"
on public.notification_rules
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = notification_rules.family_id
      and member.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = notification_rules.family_id
      and member.role = 'parent'
  )
);

create policy "notification_rules_delete_parent_only"
on public.notification_rules
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = notification_rules.family_id
      and member.role = 'parent'
  )
);

drop policy if exists "push_subscriptions_select_parent_only" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_parent_only" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_parent_only" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_parent_only" on public.push_subscriptions;

create policy "push_subscriptions_select_parent_only"
on public.push_subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = push_subscriptions.family_id
      and member.role = 'parent'
  )
);

create policy "push_subscriptions_insert_parent_only"
on public.push_subscriptions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = push_subscriptions.family_id
      and member.role = 'parent'
      and member.id = push_subscriptions.profile_id
  )
);

create policy "push_subscriptions_update_parent_only"
on public.push_subscriptions
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = push_subscriptions.family_id
      and member.role = 'parent'
      and member.id = push_subscriptions.profile_id
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = push_subscriptions.family_id
      and member.role = 'parent'
      and member.id = push_subscriptions.profile_id
  )
);

create policy "push_subscriptions_delete_parent_only"
on public.push_subscriptions
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = push_subscriptions.family_id
      and member.role = 'parent'
      and member.id = push_subscriptions.profile_id
  )
);

drop policy if exists "in_app_notifications_select_same_family" on public.in_app_notifications;
drop policy if exists "in_app_notifications_insert_parent_only" on public.in_app_notifications;
drop policy if exists "in_app_notifications_update_family" on public.in_app_notifications;
drop policy if exists "in_app_notifications_delete_parent_only" on public.in_app_notifications;

create policy "in_app_notifications_select_same_family"
on public.in_app_notifications
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = in_app_notifications.family_id
      and (member.role = 'parent' or member.id = in_app_notifications.child_profile_id)
  )
);

create policy "in_app_notifications_insert_parent_only"
on public.in_app_notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = in_app_notifications.family_id
      and member.role = 'parent'
  )
);

create policy "in_app_notifications_update_family"
on public.in_app_notifications
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = in_app_notifications.family_id
      and (member.role = 'parent' or member.id = in_app_notifications.child_profile_id)
  )
)
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = in_app_notifications.family_id
      and (member.role = 'parent' or member.id = in_app_notifications.child_profile_id)
  )
);

create policy "in_app_notifications_delete_parent_only"
on public.in_app_notifications
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = in_app_notifications.family_id
      and member.role = 'parent'
  )
);
