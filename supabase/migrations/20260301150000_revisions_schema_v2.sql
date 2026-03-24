-- Revision schema v2: canonical card type/content columns + user revision state table.

alter table if exists public.revision_cards
  add column if not exists type text,
  add column if not exists goal text,
  add column if not exists content jsonb;

update public.revision_cards
set content = coalesce(content, content_json, '{}'::jsonb)
where content is null;

update public.revision_cards
set type = case
  when coalesce(content ->> 'kind', content_json ->> 'kind') in ('concept', 'procedure', 'vocab', 'comprehension')
    then coalesce(content ->> 'kind', content_json ->> 'kind')
  else 'concept'
end
where type is null;

update public.revision_cards
set goal = coalesce(goal, content ->> 'summary', content_json ->> 'summary')
where goal is null;

alter table public.revision_cards
  alter column content set default '{}'::jsonb,
  alter column content set not null,
  alter column type set default 'concept',
  alter column type set not null;

alter table public.revision_cards
  drop constraint if exists revision_cards_type_check;

alter table public.revision_cards
  add constraint revision_cards_type_check
  check (type in ('concept', 'procedure', 'vocab', 'comprehension'));

create index if not exists revision_cards_type_idx
  on public.revision_cards (type);

create index if not exists revision_cards_status_idx
  on public.revision_cards (status);

create index if not exists revision_cards_subject_level_idx
  on public.revision_cards (subject, level);

create table if not exists public.user_revision_state (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.revision_cards (id) on delete cascade,
  status text not null check (status in ('unseen', 'in_progress', 'mastered')),
  stars int not null default 0 check (stars >= 0 and stars <= 5),
  last_reviewed_at timestamptz,
  last_quiz_score int check (last_quiz_score between 0 and 100),
  attempts int not null default 0 check (attempts >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, card_id)
);

create index if not exists user_revision_state_family_user_idx
  on public.user_revision_state (family_id, user_id, updated_at desc);

create index if not exists user_revision_state_user_idx
  on public.user_revision_state (user_id);

create index if not exists user_revision_state_card_idx
  on public.user_revision_state (card_id);

drop trigger if exists set_user_revision_state_updated_at on public.user_revision_state;
create trigger set_user_revision_state_updated_at
before update on public.user_revision_state
for each row
execute function public.set_row_updated_at();

alter table public.user_revision_state enable row level security;

grant select, insert, update, delete on table public.user_revision_state to authenticated;
grant all on table public.user_revision_state to service_role;

drop policy if exists "user_revision_state_select_family" on public.user_revision_state;
drop policy if exists "user_revision_state_insert" on public.user_revision_state;
drop policy if exists "user_revision_state_update" on public.user_revision_state;
drop policy if exists "user_revision_state_delete" on public.user_revision_state;

create policy "user_revision_state_select_family"
on public.user_revision_state
for select
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or user_id = auth.uid()
  )
);

create policy "user_revision_state_insert"
on public.user_revision_state
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and exists (
    select 1
    from public.revision_cards card
    where card.id = user_revision_state.card_id
      and card.family_id = user_revision_state.family_id
  )
  and (
    public.is_parent_in_family(family_id)
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.profiles child
        where child.id = user_revision_state.user_id
          and child.family_id = user_revision_state.family_id
          and child.role = 'child'
      )
      and exists (
        select 1
        from public.revision_cards card
        where card.id = user_revision_state.card_id
          and card.family_id = user_revision_state.family_id
          and card.status = 'published'
      )
    )
  )
);

create policy "user_revision_state_update"
on public.user_revision_state
for update
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or user_id = auth.uid()
  )
)
with check (
  family_id = public.current_family_id()
  and exists (
    select 1
    from public.revision_cards card
    where card.id = user_revision_state.card_id
      and card.family_id = user_revision_state.family_id
  )
  and (
    public.is_parent_in_family(family_id)
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.profiles child
        where child.id = user_revision_state.user_id
          and child.family_id = user_revision_state.family_id
          and child.role = 'child'
      )
      and exists (
        select 1
        from public.revision_cards card
        where card.id = user_revision_state.card_id
          and card.family_id = user_revision_state.family_id
          and card.status = 'published'
      )
    )
  )
);

create policy "user_revision_state_delete"
on public.user_revision_state
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.is_parent_in_family(family_id)
    or user_id = auth.uid()
  )
);

do $$
begin
  if to_regclass('public.revision_progress') is not null then
    insert into public.user_revision_state (
      family_id,
      user_id,
      card_id,
      status,
      stars,
      last_reviewed_at,
      last_quiz_score,
      attempts,
      created_at,
      updated_at
    )
    select
      rp.family_id,
      rp.child_profile_id,
      rp.revision_card_id,
      case rp.status
        when 'completed' then 'mastered'
        when 'in_progress' then 'in_progress'
        else 'unseen'
      end,
      greatest(0, least(5, coalesce(round(rp.confidence_score / 20.0)::int, 0))),
      rp.last_seen_at,
      rp.confidence_score,
      greatest(rp.completed_count, 0),
      rp.created_at,
      rp.updated_at
    from public.revision_progress rp
    on conflict (user_id, card_id) do update
    set
      family_id = excluded.family_id,
      status = excluded.status,
      stars = excluded.stars,
      last_reviewed_at = excluded.last_reviewed_at,
      last_quiz_score = excluded.last_quiz_score,
      attempts = greatest(public.user_revision_state.attempts, excluded.attempts),
      updated_at = greatest(public.user_revision_state.updated_at, excluded.updated_at);
  end if;
end $$;
