create table if not exists public.revision_books (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  subject text not null check (subject in ('french', 'maths', 'german')),
  level text not null check (char_length(trim(level)) >= 1),
  title text not null check (char_length(trim(title)) >= 2),
  school_year text,
  file_name text not null check (char_length(trim(file_name)) >= 1),
  file_path text not null check (char_length(trim(file_path)) >= 1),
  status text not null default 'uploaded' check (status in ('uploaded', 'indexing', 'indexed', 'error')),
  error_message text,
  indexed_text text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists revision_books_family_updated_idx
  on public.revision_books (family_id, updated_at desc);

create index if not exists revision_books_family_status_idx
  on public.revision_books (family_id, status);

create index if not exists revision_books_subject_level_idx
  on public.revision_books (subject, level);

drop trigger if exists set_revision_books_updated_at on public.revision_books;
create trigger set_revision_books_updated_at
before update on public.revision_books
for each row
execute function public.set_row_updated_at();

alter table public.revision_books enable row level security;

grant select, insert, update, delete on table public.revision_books to authenticated;
grant all on table public.revision_books to service_role;

drop policy if exists "revision_books_select_parent_only" on public.revision_books;
drop policy if exists "revision_books_insert_parent_only" on public.revision_books;
drop policy if exists "revision_books_update_parent_only" on public.revision_books;
drop policy if exists "revision_books_delete_parent_only" on public.revision_books;

create policy "revision_books_select_parent_only"
on public.revision_books
for select
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

create policy "revision_books_insert_parent_only"
on public.revision_books
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

create policy "revision_books_update_parent_only"
on public.revision_books
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

create policy "revision_books_delete_parent_only"
on public.revision_books
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);
