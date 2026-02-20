alter table public.school_diary_entries
add column if not exists recurrence_pattern text not null default 'none'
  check (recurrence_pattern in ('none', 'weekly', 'biweekly', 'monthly'));

alter table public.school_diary_entries
add column if not exists recurrence_until_date date;

alter table public.school_diary_entries
add column if not exists recurrence_group_id uuid;

create index if not exists school_diary_entries_recurrence_group_idx
  on public.school_diary_entries (recurrence_group_id);
