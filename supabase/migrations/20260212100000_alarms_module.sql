create table if not exists public.alarm_rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  mode text not null check (mode in ('ponctuelle', 'semaine_travail', 'semaine_complete', 'personnalise')),
  one_shot_at timestamptz,
  time_of_day time,
  days_mask int not null default 0 check (days_mask >= 0 and days_mask <= 127),
  sound_key text not null default 'cloche_douce',
  message text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (mode = 'ponctuelle' and one_shot_at is not null and time_of_day is null)
    or (mode <> 'ponctuelle' and one_shot_at is null and time_of_day is not null)
  )
);

create table if not exists public.alarm_events (
  id uuid primary key default gen_random_uuid(),
  alarm_rule_id uuid not null references public.alarm_rules (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  due_at timestamptz not null,
  triggered_at timestamptz not null default timezone('utc', now()),
  acknowledged_at timestamptz,
  status text not null check (status in ('declenchee', 'acknowledged')) default 'declenchee',
  created_at timestamptz not null default timezone('utc', now()),
  unique (alarm_rule_id, due_at)
);

create index if not exists alarm_rules_family_child_enabled_idx
  on public.alarm_rules (family_id, child_profile_id, enabled);

create index if not exists alarm_events_child_status_idx
  on public.alarm_events (child_profile_id, status, triggered_at desc);

create index if not exists alarm_events_rule_due_idx
  on public.alarm_events (alarm_rule_id, due_at desc);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_alarm_rules_updated_at on public.alarm_rules;
create trigger set_alarm_rules_updated_at
before update on public.alarm_rules
for each row
execute function public.set_row_updated_at();

alter table public.alarm_rules enable row level security;
alter table public.alarm_events enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.alarm_rules to authenticated;
grant select, insert, update, delete on table public.alarm_events to authenticated;
grant all on table public.alarm_rules to service_role;
grant all on table public.alarm_events to service_role;

drop policy if exists "alarm_rules_select_family" on public.alarm_rules;
drop policy if exists "alarm_rules_insert_parent_only" on public.alarm_rules;
drop policy if exists "alarm_rules_update_parent_only" on public.alarm_rules;
drop policy if exists "alarm_rules_delete_parent_only" on public.alarm_rules;

create policy "alarm_rules_select_family"
on public.alarm_rules
for select
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or child_profile_id = auth.uid()
  )
);

create policy "alarm_rules_insert_parent_only"
on public.alarm_rules
for insert
to authenticated
with check (public.is_parent_in_family(family_id));

create policy "alarm_rules_update_parent_only"
on public.alarm_rules
for update
to authenticated
using (public.is_parent_in_family(family_id))
with check (public.is_parent_in_family(family_id));

create policy "alarm_rules_delete_parent_only"
on public.alarm_rules
for delete
to authenticated
using (public.is_parent_in_family(family_id));

drop policy if exists "alarm_events_select_family" on public.alarm_events;
drop policy if exists "alarm_events_insert_family" on public.alarm_events;
drop policy if exists "alarm_events_update_ack_family" on public.alarm_events;
drop policy if exists "alarm_events_delete_parent_only" on public.alarm_events;

create policy "alarm_events_select_family"
on public.alarm_events
for select
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or child_profile_id = auth.uid()
  )
);

create policy "alarm_events_insert_family"
on public.alarm_events
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and exists (
    select 1
    from public.alarm_rules rule
    where rule.id = alarm_events.alarm_rule_id
      and rule.family_id = alarm_events.family_id
      and rule.child_profile_id = alarm_events.child_profile_id
  )
  and (
    public.is_parent_in_family(family_id)
    or child_profile_id = auth.uid()
  )
);

create policy "alarm_events_update_ack_family"
on public.alarm_events
for update
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or child_profile_id = auth.uid()
  )
)
with check (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or child_profile_id = auth.uid()
  )
);

create policy "alarm_events_delete_parent_only"
on public.alarm_events
for delete
to authenticated
using (public.is_parent_in_family(family_id));
