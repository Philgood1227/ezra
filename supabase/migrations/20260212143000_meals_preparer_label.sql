alter table public.meals
add column if not exists prepared_by_label text;

update public.meals as meal
set prepared_by_label = profile.display_name
from public.profiles as profile
where meal.prepared_by_label is null
  and meal.prepared_by_profile_id = profile.id;

create index if not exists meals_family_prepared_by_label_idx
  on public.meals (family_id, prepared_by_label);
