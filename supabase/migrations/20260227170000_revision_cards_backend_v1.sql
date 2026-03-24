create table if not exists public.revision_cards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(trim(title)) >= 2),
  subject text not null check (char_length(trim(subject)) >= 2),
  level text,
  tags text[] not null default '{}',
  content_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.revision_card_links (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  revision_card_id uuid not null references public.revision_cards (id) on delete cascade,
  template_task_id uuid not null references public.template_tasks (id) on delete cascade,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (revision_card_id, template_task_id)
);

create table if not exists public.revision_progress (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  revision_card_id uuid not null references public.revision_cards (id) on delete cascade,
  last_seen_at timestamptz,
  completed_count int not null default 0 check (completed_count >= 0),
  success_streak int not null default 0 check (success_streak >= 0),
  confidence_score int check (confidence_score between 0 and 100),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (child_profile_id, revision_card_id)
);

create index if not exists revision_cards_family_status_updated_idx
  on public.revision_cards (family_id, status, updated_at desc);

create index if not exists revision_cards_family_subject_idx
  on public.revision_cards (family_id, lower(subject));

create index if not exists revision_cards_tags_gin_idx
  on public.revision_cards using gin (tags);

create index if not exists revision_cards_content_json_gin_idx
  on public.revision_cards using gin (content_json);

create index if not exists revision_card_links_family_idx
  on public.revision_card_links (family_id, revision_card_id);

create index if not exists revision_progress_family_child_idx
  on public.revision_progress (family_id, child_profile_id, updated_at desc);

create index if not exists revision_progress_card_idx
  on public.revision_progress (revision_card_id);

drop trigger if exists set_revision_cards_updated_at on public.revision_cards;
create trigger set_revision_cards_updated_at
before update on public.revision_cards
for each row
execute function public.set_row_updated_at();

drop trigger if exists set_revision_progress_updated_at on public.revision_progress;
create trigger set_revision_progress_updated_at
before update on public.revision_progress
for each row
execute function public.set_row_updated_at();

alter table public.revision_cards enable row level security;
alter table public.revision_card_links enable row level security;
alter table public.revision_progress enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.revision_cards to authenticated;
grant select, insert, update, delete on table public.revision_card_links to authenticated;
grant select, insert, update, delete on table public.revision_progress to authenticated;
grant all on table public.revision_cards to service_role;
grant all on table public.revision_card_links to service_role;
grant all on table public.revision_progress to service_role;

drop policy if exists "revision_cards_select_family" on public.revision_cards;
drop policy if exists "revision_cards_insert_parent_only" on public.revision_cards;
drop policy if exists "revision_cards_update_parent_only" on public.revision_cards;
drop policy if exists "revision_cards_delete_parent_only" on public.revision_cards;

create policy "revision_cards_select_family"
on public.revision_cards
for select
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or status = 'published'
  )
);

create policy "revision_cards_insert_parent_only"
on public.revision_cards
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
  and (
    created_by_profile_id is null
    or created_by_profile_id = auth.uid()
  )
);

create policy "revision_cards_update_parent_only"
on public.revision_cards
for update
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
)
with check (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
  and (
    created_by_profile_id is null
    or created_by_profile_id = auth.uid()
  )
);

create policy "revision_cards_delete_parent_only"
on public.revision_cards
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

drop policy if exists "revision_card_links_select_parent_only" on public.revision_card_links;
drop policy if exists "revision_card_links_insert_parent_only" on public.revision_card_links;
drop policy if exists "revision_card_links_update_parent_only" on public.revision_card_links;
drop policy if exists "revision_card_links_delete_parent_only" on public.revision_card_links;

create policy "revision_card_links_select_parent_only"
on public.revision_card_links
for select
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

create policy "revision_card_links_insert_parent_only"
on public.revision_card_links
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
  and exists (
    select 1
    from public.revision_cards card
    where card.id = revision_card_links.revision_card_id
      and card.family_id = revision_card_links.family_id
  )
  and exists (
    select 1
    from public.template_tasks task
    join public.day_templates template on template.id = task.template_id
    where task.id = revision_card_links.template_task_id
      and template.family_id = revision_card_links.family_id
  )
);

create policy "revision_card_links_update_parent_only"
on public.revision_card_links
for update
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
)
with check (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
  and exists (
    select 1
    from public.revision_cards card
    where card.id = revision_card_links.revision_card_id
      and card.family_id = revision_card_links.family_id
  )
  and exists (
    select 1
    from public.template_tasks task
    join public.day_templates template on template.id = task.template_id
    where task.id = revision_card_links.template_task_id
      and template.family_id = revision_card_links.family_id
  )
);

create policy "revision_card_links_delete_parent_only"
on public.revision_card_links
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

drop policy if exists "revision_progress_select_family" on public.revision_progress;
drop policy if exists "revision_progress_insert_child_self" on public.revision_progress;
drop policy if exists "revision_progress_update_child_self" on public.revision_progress;
drop policy if exists "revision_progress_delete_child_self" on public.revision_progress;

create policy "revision_progress_select_family"
on public.revision_progress
for select
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or child_profile_id = auth.uid()
  )
);

create policy "revision_progress_insert_child_self"
on public.revision_progress
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and child_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles child
    where child.id = revision_progress.child_profile_id
      and child.family_id = revision_progress.family_id
      and child.role = 'child'
  )
  and exists (
    select 1
    from public.revision_cards card
    where card.id = revision_progress.revision_card_id
      and card.family_id = revision_progress.family_id
      and card.status = 'published'
  )
);

create policy "revision_progress_update_child_self"
on public.revision_progress
for update
to authenticated
using (
  family_id = public.current_family_id()
  and child_profile_id = auth.uid()
)
with check (
  family_id = public.current_family_id()
  and child_profile_id = auth.uid()
  and exists (
    select 1
    from public.revision_cards card
    where card.id = revision_progress.revision_card_id
      and card.family_id = revision_progress.family_id
      and card.status = 'published'
  )
);

create policy "revision_progress_delete_child_self"
on public.revision_progress
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and child_profile_id = auth.uid()
);
