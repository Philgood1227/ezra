create table if not exists public.knowledge_subjects (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  code text not null,
  label text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (family_id, code)
);

create table if not exists public.knowledge_categories (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.knowledge_subjects (id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.knowledge_cards (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.knowledge_categories (id) on delete cascade,
  title text not null,
  summary text,
  content jsonb not null,
  difficulty text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.knowledge_favorites (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.knowledge_cards (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (child_profile_id, card_id)
);

create table if not exists public.achievement_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  code text not null,
  label text not null,
  color_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (family_id, code)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.achievement_categories (id) on delete cascade,
  code text not null,
  label text not null,
  description text,
  icon text not null,
  auto_trigger boolean not null default true,
  condition jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (category_id, code)
);

create table if not exists public.achievement_instances (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  unlocked_at timestamptz not null default timezone('utc', now()),
  unique (achievement_id, child_profile_id)
);

create table if not exists public.movie_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  date date not null,
  time time,
  status text not null check (status in ('planifiee', 'choisie', 'terminee')) default 'planifiee',
  proposer_profile_id uuid references public.profiles (id),
  picker_profile_id uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.movie_options (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.movie_sessions (id) on delete cascade,
  title text not null,
  platform text,
  duration_minutes int,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.movie_sessions
add column if not exists chosen_option_id uuid;

create table if not exists public.movie_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.movie_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  movie_option_id uuid not null references public.movie_options (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_id, profile_id)
);

alter table public.template_tasks
add column if not exists knowledge_card_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'template_tasks_knowledge_card_id_fkey'
  ) then
    alter table public.template_tasks
      add constraint template_tasks_knowledge_card_id_fkey
      foreign key (knowledge_card_id)
      references public.knowledge_cards (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'movie_sessions_chosen_option_id_fkey'
  ) then
    alter table public.movie_sessions
      add constraint movie_sessions_chosen_option_id_fkey
      foreign key (chosen_option_id)
      references public.movie_options (id)
      on delete set null;
  end if;
end $$;

create index if not exists knowledge_subjects_family_label_idx
  on public.knowledge_subjects (family_id, label);

create index if not exists knowledge_categories_subject_sort_idx
  on public.knowledge_categories (subject_id, sort_order, label);

create index if not exists knowledge_cards_category_created_idx
  on public.knowledge_cards (category_id, created_at desc);

create index if not exists knowledge_favorites_child_idx
  on public.knowledge_favorites (child_profile_id, created_at desc);

create index if not exists achievement_categories_family_idx
  on public.achievement_categories (family_id, code);

create index if not exists achievements_category_idx
  on public.achievements (category_id, code);

create index if not exists achievement_instances_child_unlocked_idx
  on public.achievement_instances (child_profile_id, unlocked_at desc);

create index if not exists movie_sessions_family_date_idx
  on public.movie_sessions (family_id, date, status);

create index if not exists movie_options_session_idx
  on public.movie_options (session_id, created_at);

create index if not exists movie_votes_session_option_idx
  on public.movie_votes (session_id, movie_option_id);

create index if not exists template_tasks_knowledge_card_idx
  on public.template_tasks (knowledge_card_id);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_knowledge_cards_updated_at on public.knowledge_cards;
create trigger set_knowledge_cards_updated_at
before update on public.knowledge_cards
for each row
execute function public.set_row_updated_at();

alter table public.knowledge_subjects enable row level security;
alter table public.knowledge_categories enable row level security;
alter table public.knowledge_cards enable row level security;
alter table public.knowledge_favorites enable row level security;
alter table public.achievement_categories enable row level security;
alter table public.achievements enable row level security;
alter table public.achievement_instances enable row level security;
alter table public.movie_sessions enable row level security;
alter table public.movie_options enable row level security;
alter table public.movie_votes enable row level security;

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.knowledge_subjects to authenticated;
grant select, insert, update, delete on table public.knowledge_categories to authenticated;
grant select, insert, update, delete on table public.knowledge_cards to authenticated;
grant select, insert, update, delete on table public.knowledge_favorites to authenticated;
grant all on table public.knowledge_subjects to service_role;
grant all on table public.knowledge_categories to service_role;
grant all on table public.knowledge_cards to service_role;
grant all on table public.knowledge_favorites to service_role;

grant select, insert, update, delete on table public.achievement_categories to authenticated;
grant select, insert, update, delete on table public.achievements to authenticated;
grant select, insert, update, delete on table public.achievement_instances to authenticated;
grant all on table public.achievement_categories to service_role;
grant all on table public.achievements to service_role;
grant all on table public.achievement_instances to service_role;

grant select, insert, update, delete on table public.movie_sessions to authenticated;
grant select, insert, update, delete on table public.movie_options to authenticated;
grant select, insert, update, delete on table public.movie_votes to authenticated;
grant all on table public.movie_sessions to service_role;
grant all on table public.movie_options to service_role;
grant all on table public.movie_votes to service_role;

drop policy if exists "knowledge_subjects_select_same_family" on public.knowledge_subjects;
drop policy if exists "knowledge_subjects_insert_parent_only" on public.knowledge_subjects;
drop policy if exists "knowledge_subjects_update_parent_only" on public.knowledge_subjects;
drop policy if exists "knowledge_subjects_delete_parent_only" on public.knowledge_subjects;

create policy "knowledge_subjects_select_same_family"
on public.knowledge_subjects
for select
to authenticated
using (family_id = public.current_family_id());

create policy "knowledge_subjects_insert_parent_only"
on public.knowledge_subjects
for insert
to authenticated
with check (public.is_parent_in_family(family_id));

create policy "knowledge_subjects_update_parent_only"
on public.knowledge_subjects
for update
to authenticated
using (public.is_parent_in_family(family_id))
with check (public.is_parent_in_family(family_id));

create policy "knowledge_subjects_delete_parent_only"
on public.knowledge_subjects
for delete
to authenticated
using (public.is_parent_in_family(family_id));

drop policy if exists "knowledge_categories_select_same_family" on public.knowledge_categories;
drop policy if exists "knowledge_categories_insert_parent_only" on public.knowledge_categories;
drop policy if exists "knowledge_categories_update_parent_only" on public.knowledge_categories;
drop policy if exists "knowledge_categories_delete_parent_only" on public.knowledge_categories;

create policy "knowledge_categories_select_same_family"
on public.knowledge_categories
for select
to authenticated
using (
  exists (
    select 1
    from public.knowledge_subjects subject
    where subject.id = knowledge_categories.subject_id
      and subject.family_id = public.current_family_id()
  )
);

create policy "knowledge_categories_insert_parent_only"
on public.knowledge_categories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.knowledge_subjects subject
    where subject.id = knowledge_categories.subject_id
      and public.is_parent_in_family(subject.family_id)
  )
);

create policy "knowledge_categories_update_parent_only"
on public.knowledge_categories
for update
to authenticated
using (
  exists (
    select 1
    from public.knowledge_subjects subject
    where subject.id = knowledge_categories.subject_id
      and public.is_parent_in_family(subject.family_id)
  )
)
with check (
  exists (
    select 1
    from public.knowledge_subjects subject
    where subject.id = knowledge_categories.subject_id
      and public.is_parent_in_family(subject.family_id)
  )
);

create policy "knowledge_categories_delete_parent_only"
on public.knowledge_categories
for delete
to authenticated
using (
  exists (
    select 1
    from public.knowledge_subjects subject
    where subject.id = knowledge_categories.subject_id
      and public.is_parent_in_family(subject.family_id)
  )
);

drop policy if exists "knowledge_cards_select_same_family" on public.knowledge_cards;
drop policy if exists "knowledge_cards_insert_parent_only" on public.knowledge_cards;
drop policy if exists "knowledge_cards_update_parent_only" on public.knowledge_cards;
drop policy if exists "knowledge_cards_delete_parent_only" on public.knowledge_cards;

create policy "knowledge_cards_select_same_family"
on public.knowledge_cards
for select
to authenticated
using (
  exists (
    select 1
    from public.knowledge_categories category
    join public.knowledge_subjects subject on subject.id = category.subject_id
    where category.id = knowledge_cards.category_id
      and subject.family_id = public.current_family_id()
  )
);

create policy "knowledge_cards_insert_parent_only"
on public.knowledge_cards
for insert
to authenticated
with check (
  exists (
    select 1
    from public.knowledge_categories category
    join public.knowledge_subjects subject on subject.id = category.subject_id
    where category.id = knowledge_cards.category_id
      and public.is_parent_in_family(subject.family_id)
  )
);

create policy "knowledge_cards_update_parent_only"
on public.knowledge_cards
for update
to authenticated
using (
  exists (
    select 1
    from public.knowledge_categories category
    join public.knowledge_subjects subject on subject.id = category.subject_id
    where category.id = knowledge_cards.category_id
      and public.is_parent_in_family(subject.family_id)
  )
)
with check (
  exists (
    select 1
    from public.knowledge_categories category
    join public.knowledge_subjects subject on subject.id = category.subject_id
    where category.id = knowledge_cards.category_id
      and public.is_parent_in_family(subject.family_id)
  )
);

create policy "knowledge_cards_delete_parent_only"
on public.knowledge_cards
for delete
to authenticated
using (
  exists (
    select 1
    from public.knowledge_categories category
    join public.knowledge_subjects subject on subject.id = category.subject_id
    where category.id = knowledge_cards.category_id
      and public.is_parent_in_family(subject.family_id)
  )
);

drop policy if exists "knowledge_favorites_select_family" on public.knowledge_favorites;
drop policy if exists "knowledge_favorites_insert_child_only" on public.knowledge_favorites;
drop policy if exists "knowledge_favorites_update_child_only" on public.knowledge_favorites;
drop policy if exists "knowledge_favorites_delete_child_only" on public.knowledge_favorites;

create policy "knowledge_favorites_select_family"
on public.knowledge_favorites
for select
to authenticated
using (
  exists (
    select 1
    from public.knowledge_cards card
    join public.knowledge_categories category on category.id = card.category_id
    join public.knowledge_subjects subject on subject.id = category.subject_id
    join public.profiles member on member.id = auth.uid()
    where card.id = knowledge_favorites.card_id
      and (
        (member.role = 'parent' and member.family_id = subject.family_id)
        or (
          member.role = 'child'
          and member.id = knowledge_favorites.child_profile_id
          and member.family_id = subject.family_id
        )
      )
  )
);

create policy "knowledge_favorites_insert_child_only"
on public.knowledge_favorites
for insert
to authenticated
with check (
  child_profile_id = auth.uid()
  and exists (
    select 1
    from public.knowledge_cards card
    join public.knowledge_categories category on category.id = card.category_id
    join public.knowledge_subjects subject on subject.id = category.subject_id
    join public.profiles member on member.id = auth.uid()
    where card.id = knowledge_favorites.card_id
      and member.role = 'child'
      and member.family_id = subject.family_id
  )
);

create policy "knowledge_favorites_update_child_only"
on public.knowledge_favorites
for update
to authenticated
using (child_profile_id = auth.uid())
with check (child_profile_id = auth.uid());

create policy "knowledge_favorites_delete_child_only"
on public.knowledge_favorites
for delete
to authenticated
using (child_profile_id = auth.uid());

drop policy if exists "achievement_categories_select_same_family" on public.achievement_categories;
drop policy if exists "achievement_categories_insert_parent_only" on public.achievement_categories;
drop policy if exists "achievement_categories_update_parent_only" on public.achievement_categories;
drop policy if exists "achievement_categories_delete_parent_only" on public.achievement_categories;

create policy "achievement_categories_select_same_family"
on public.achievement_categories
for select
to authenticated
using (family_id = public.current_family_id());

create policy "achievement_categories_insert_parent_only"
on public.achievement_categories
for insert
to authenticated
with check (public.is_parent_in_family(family_id));

create policy "achievement_categories_update_parent_only"
on public.achievement_categories
for update
to authenticated
using (public.is_parent_in_family(family_id))
with check (public.is_parent_in_family(family_id));

create policy "achievement_categories_delete_parent_only"
on public.achievement_categories
for delete
to authenticated
using (public.is_parent_in_family(family_id));

drop policy if exists "achievements_select_same_family" on public.achievements;
drop policy if exists "achievements_insert_parent_only" on public.achievements;
drop policy if exists "achievements_update_parent_only" on public.achievements;
drop policy if exists "achievements_delete_parent_only" on public.achievements;

create policy "achievements_select_same_family"
on public.achievements
for select
to authenticated
using (
  exists (
    select 1
    from public.achievement_categories category
    where category.id = achievements.category_id
      and category.family_id = public.current_family_id()
  )
);

create policy "achievements_insert_parent_only"
on public.achievements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.achievement_categories category
    where category.id = achievements.category_id
      and public.is_parent_in_family(category.family_id)
  )
);

create policy "achievements_update_parent_only"
on public.achievements
for update
to authenticated
using (
  exists (
    select 1
    from public.achievement_categories category
    where category.id = achievements.category_id
      and public.is_parent_in_family(category.family_id)
  )
)
with check (
  exists (
    select 1
    from public.achievement_categories category
    where category.id = achievements.category_id
      and public.is_parent_in_family(category.family_id)
  )
);

create policy "achievements_delete_parent_only"
on public.achievements
for delete
to authenticated
using (
  exists (
    select 1
    from public.achievement_categories category
    where category.id = achievements.category_id
      and public.is_parent_in_family(category.family_id)
  )
);

drop policy if exists "achievement_instances_select_family" on public.achievement_instances;
drop policy if exists "achievement_instances_insert_family" on public.achievement_instances;
drop policy if exists "achievement_instances_delete_parent_only" on public.achievement_instances;

create policy "achievement_instances_select_family"
on public.achievement_instances
for select
to authenticated
using (
  exists (
    select 1
    from public.achievements achievement
    join public.achievement_categories category on category.id = achievement.category_id
    join public.profiles member on member.id = auth.uid()
    where achievement.id = achievement_instances.achievement_id
      and member.family_id = category.family_id
      and (member.role = 'parent' or member.id = achievement_instances.child_profile_id)
  )
);

create policy "achievement_instances_insert_family"
on public.achievement_instances
for insert
to authenticated
with check (
  exists (
    select 1
    from public.achievements achievement
    join public.achievement_categories category on category.id = achievement.category_id
    join public.profiles member on member.id = auth.uid()
    where achievement.id = achievement_instances.achievement_id
      and member.family_id = category.family_id
      and (member.role = 'parent' or member.id = achievement_instances.child_profile_id)
  )
);

create policy "achievement_instances_delete_parent_only"
on public.achievement_instances
for delete
to authenticated
using (
  exists (
    select 1
    from public.achievements achievement
    join public.achievement_categories category on category.id = achievement.category_id
    where achievement.id = achievement_instances.achievement_id
      and public.is_parent_in_family(category.family_id)
  )
);

drop policy if exists "movie_sessions_select_same_family" on public.movie_sessions;
drop policy if exists "movie_sessions_insert_parent_only" on public.movie_sessions;
drop policy if exists "movie_sessions_update_parent_only" on public.movie_sessions;
drop policy if exists "movie_sessions_delete_parent_only" on public.movie_sessions;

create policy "movie_sessions_select_same_family"
on public.movie_sessions
for select
to authenticated
using (family_id = public.current_family_id());

create policy "movie_sessions_insert_parent_only"
on public.movie_sessions
for insert
to authenticated
with check (public.is_parent_in_family(family_id));

create policy "movie_sessions_update_parent_only"
on public.movie_sessions
for update
to authenticated
using (public.is_parent_in_family(family_id))
with check (public.is_parent_in_family(family_id));

create policy "movie_sessions_delete_parent_only"
on public.movie_sessions
for delete
to authenticated
using (public.is_parent_in_family(family_id));

drop policy if exists "movie_options_select_same_family" on public.movie_options;
drop policy if exists "movie_options_insert_parent_only" on public.movie_options;
drop policy if exists "movie_options_update_parent_only" on public.movie_options;
drop policy if exists "movie_options_delete_parent_only" on public.movie_options;

create policy "movie_options_select_same_family"
on public.movie_options
for select
to authenticated
using (
  exists (
    select 1
    from public.movie_sessions session
    where session.id = movie_options.session_id
      and session.family_id = public.current_family_id()
  )
);

create policy "movie_options_insert_parent_only"
on public.movie_options
for insert
to authenticated
with check (
  exists (
    select 1
    from public.movie_sessions session
    where session.id = movie_options.session_id
      and public.is_parent_in_family(session.family_id)
  )
);

create policy "movie_options_update_parent_only"
on public.movie_options
for update
to authenticated
using (
  exists (
    select 1
    from public.movie_sessions session
    where session.id = movie_options.session_id
      and public.is_parent_in_family(session.family_id)
  )
)
with check (
  exists (
    select 1
    from public.movie_sessions session
    where session.id = movie_options.session_id
      and public.is_parent_in_family(session.family_id)
  )
);

create policy "movie_options_delete_parent_only"
on public.movie_options
for delete
to authenticated
using (
  exists (
    select 1
    from public.movie_sessions session
    where session.id = movie_options.session_id
      and public.is_parent_in_family(session.family_id)
  )
);

drop policy if exists "movie_votes_select_same_family" on public.movie_votes;
drop policy if exists "movie_votes_insert_family" on public.movie_votes;
drop policy if exists "movie_votes_update_family" on public.movie_votes;
drop policy if exists "movie_votes_delete_family" on public.movie_votes;

create policy "movie_votes_select_same_family"
on public.movie_votes
for select
to authenticated
using (
  exists (
    select 1
    from public.movie_sessions session
    join public.profiles member on member.id = auth.uid()
    where session.id = movie_votes.session_id
      and member.family_id = session.family_id
  )
);

create policy "movie_votes_insert_family"
on public.movie_votes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.movie_sessions session
    join public.profiles member on member.id = auth.uid()
    where session.id = movie_votes.session_id
      and member.family_id = session.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = movie_votes.profile_id)
      )
  )
  and exists (
    select 1
    from public.movie_options option
    where option.id = movie_votes.movie_option_id
      and option.session_id = movie_votes.session_id
  )
);

create policy "movie_votes_update_family"
on public.movie_votes
for update
to authenticated
using (
  exists (
    select 1
    from public.movie_sessions session
    join public.profiles member on member.id = auth.uid()
    where session.id = movie_votes.session_id
      and member.family_id = session.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = movie_votes.profile_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.movie_sessions session
    join public.profiles member on member.id = auth.uid()
    where session.id = movie_votes.session_id
      and member.family_id = session.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = movie_votes.profile_id)
      )
  )
  and exists (
    select 1
    from public.movie_options option
    where option.id = movie_votes.movie_option_id
      and option.session_id = movie_votes.session_id
  )
);

create policy "movie_votes_delete_family"
on public.movie_votes
for delete
to authenticated
using (
  exists (
    select 1
    from public.movie_sessions session
    join public.profiles member on member.id = auth.uid()
    where session.id = movie_votes.session_id
      and member.family_id = session.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = movie_votes.profile_id)
      )
  )
);
