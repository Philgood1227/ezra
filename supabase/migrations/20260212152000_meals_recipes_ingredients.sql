create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  label text not null,
  emoji text not null default 'ingredient',
  default_unit text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.meals
add column if not exists recipe_id uuid references public.recipes (id) on delete set null;

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  quantity numeric(10,2),
  unit text,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  quantity numeric(10,2),
  unit text,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists ingredients_family_label_unique_idx
  on public.ingredients (family_id, lower(label));

create index if not exists ingredients_family_label_idx
  on public.ingredients (family_id, label);

create index if not exists recipes_family_title_idx
  on public.recipes (family_id, title);

create unique index if not exists recipe_ingredients_recipe_ingredient_unique_idx
  on public.recipe_ingredients (recipe_id, ingredient_id);

create index if not exists recipe_ingredients_recipe_sort_idx
  on public.recipe_ingredients (recipe_id, sort_order, created_at);

create index if not exists meal_ingredients_meal_sort_idx
  on public.meal_ingredients (meal_id, sort_order, created_at);

create index if not exists meals_recipe_id_idx
  on public.meals (recipe_id);

drop trigger if exists set_ingredients_updated_at on public.ingredients;
create trigger set_ingredients_updated_at
before update on public.ingredients
for each row
execute function public.set_row_updated_at();

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row
execute function public.set_row_updated_at();

alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_ingredients enable row level security;

grant select, insert, update, delete on table public.ingredients to authenticated;
grant select, insert, update, delete on table public.recipes to authenticated;
grant select, insert, update, delete on table public.recipe_ingredients to authenticated;
grant select, insert, update, delete on table public.meal_ingredients to authenticated;
grant all on table public.ingredients to service_role;
grant all on table public.recipes to service_role;
grant all on table public.recipe_ingredients to service_role;
grant all on table public.meal_ingredients to service_role;

drop policy if exists "meals_select_family" on public.meals;
create policy "meals_select_family"
on public.meals
for select
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

drop policy if exists "meal_ratings_select_family" on public.meal_ratings;
create policy "meal_ratings_select_family"
on public.meal_ratings
for select
to authenticated
using (
  exists (
    select 1
    from public.meals meal
    where meal.id = meal_ratings.meal_id
      and meal.family_id = public.current_family_id()
      and public.is_parent_in_family(meal.family_id)
  )
);

drop policy if exists "meal_ratings_insert_child_only" on public.meal_ratings;
create policy "meal_ratings_insert_child_only"
on public.meal_ratings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.meals meal
    where meal.id = meal_ratings.meal_id
      and meal.family_id = public.current_family_id()
      and public.is_parent_in_family(meal.family_id)
  )
);

drop policy if exists "meal_ratings_update_family" on public.meal_ratings;
create policy "meal_ratings_update_family"
on public.meal_ratings
for update
to authenticated
using (
  exists (
    select 1
    from public.meals meal
    where meal.id = meal_ratings.meal_id
      and meal.family_id = public.current_family_id()
      and public.is_parent_in_family(meal.family_id)
  )
)
with check (
  exists (
    select 1
    from public.meals meal
    where meal.id = meal_ratings.meal_id
      and meal.family_id = public.current_family_id()
      and public.is_parent_in_family(meal.family_id)
  )
);

drop policy if exists "meal_ratings_delete_family" on public.meal_ratings;
create policy "meal_ratings_delete_family"
on public.meal_ratings
for delete
to authenticated
using (
  exists (
    select 1
    from public.meals meal
    where meal.id = meal_ratings.meal_id
      and meal.family_id = public.current_family_id()
      and public.is_parent_in_family(meal.family_id)
  )
);

drop policy if exists "ingredients_select_family" on public.ingredients;
drop policy if exists "ingredients_insert_parent" on public.ingredients;
drop policy if exists "ingredients_update_parent" on public.ingredients;
drop policy if exists "ingredients_delete_parent" on public.ingredients;

create policy "ingredients_select_family"
on public.ingredients
for select
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

create policy "ingredients_insert_parent"
on public.ingredients
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

create policy "ingredients_update_parent"
on public.ingredients
for update
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
)
with check (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

create policy "ingredients_delete_parent"
on public.ingredients
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

drop policy if exists "recipes_select_family" on public.recipes;
drop policy if exists "recipes_insert_parent" on public.recipes;
drop policy if exists "recipes_update_parent" on public.recipes;
drop policy if exists "recipes_delete_parent" on public.recipes;

create policy "recipes_select_family"
on public.recipes
for select
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

create policy "recipes_insert_parent"
on public.recipes
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

create policy "recipes_update_parent"
on public.recipes
for update
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
)
with check (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

create policy "recipes_delete_parent"
on public.recipes
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.is_parent_in_family(family_id)
);

drop policy if exists "recipe_ingredients_select_parent" on public.recipe_ingredients;
drop policy if exists "recipe_ingredients_insert_parent" on public.recipe_ingredients;
drop policy if exists "recipe_ingredients_update_parent" on public.recipe_ingredients;
drop policy if exists "recipe_ingredients_delete_parent" on public.recipe_ingredients;

create policy "recipe_ingredients_select_parent"
on public.recipe_ingredients
for select
to authenticated
using (
  exists (
    select 1
    from public.recipes recipe
    where recipe.id = recipe_ingredients.recipe_id
      and recipe.family_id = public.current_family_id()
      and public.is_parent_in_family(recipe.family_id)
  )
);

create policy "recipe_ingredients_insert_parent"
on public.recipe_ingredients
for insert
to authenticated
with check (
  exists (
    select 1
    from public.recipes recipe
    join public.ingredients ingredient on ingredient.id = recipe_ingredients.ingredient_id
    where recipe.id = recipe_ingredients.recipe_id
      and recipe.family_id = public.current_family_id()
      and ingredient.family_id = recipe.family_id
      and public.is_parent_in_family(recipe.family_id)
  )
);

create policy "recipe_ingredients_update_parent"
on public.recipe_ingredients
for update
to authenticated
using (
  exists (
    select 1
    from public.recipes recipe
    where recipe.id = recipe_ingredients.recipe_id
      and recipe.family_id = public.current_family_id()
      and public.is_parent_in_family(recipe.family_id)
  )
)
with check (
  exists (
    select 1
    from public.recipes recipe
    join public.ingredients ingredient on ingredient.id = recipe_ingredients.ingredient_id
    where recipe.id = recipe_ingredients.recipe_id
      and recipe.family_id = public.current_family_id()
      and ingredient.family_id = recipe.family_id
      and public.is_parent_in_family(recipe.family_id)
  )
);

create policy "recipe_ingredients_delete_parent"
on public.recipe_ingredients
for delete
to authenticated
using (
  exists (
    select 1
    from public.recipes recipe
    where recipe.id = recipe_ingredients.recipe_id
      and recipe.family_id = public.current_family_id()
      and public.is_parent_in_family(recipe.family_id)
  )
);

drop policy if exists "meal_ingredients_select_parent" on public.meal_ingredients;
drop policy if exists "meal_ingredients_insert_parent" on public.meal_ingredients;
drop policy if exists "meal_ingredients_update_parent" on public.meal_ingredients;
drop policy if exists "meal_ingredients_delete_parent" on public.meal_ingredients;

create policy "meal_ingredients_select_parent"
on public.meal_ingredients
for select
to authenticated
using (
  exists (
    select 1
    from public.meals meal
    where meal.id = meal_ingredients.meal_id
      and meal.family_id = public.current_family_id()
      and public.is_parent_in_family(meal.family_id)
  )
);

create policy "meal_ingredients_insert_parent"
on public.meal_ingredients
for insert
to authenticated
with check (
  exists (
    select 1
    from public.meals meal
    join public.ingredients ingredient on ingredient.id = meal_ingredients.ingredient_id
    where meal.id = meal_ingredients.meal_id
      and meal.family_id = public.current_family_id()
      and ingredient.family_id = meal.family_id
      and public.is_parent_in_family(meal.family_id)
  )
);

create policy "meal_ingredients_update_parent"
on public.meal_ingredients
for update
to authenticated
using (
  exists (
    select 1
    from public.meals meal
    where meal.id = meal_ingredients.meal_id
      and meal.family_id = public.current_family_id()
      and public.is_parent_in_family(meal.family_id)
  )
)
with check (
  exists (
    select 1
    from public.meals meal
    join public.ingredients ingredient on ingredient.id = meal_ingredients.ingredient_id
    where meal.id = meal_ingredients.meal_id
      and meal.family_id = public.current_family_id()
      and ingredient.family_id = meal.family_id
      and public.is_parent_in_family(meal.family_id)
  )
);

create policy "meal_ingredients_delete_parent"
on public.meal_ingredients
for delete
to authenticated
using (
  exists (
    select 1
    from public.meals meal
    where meal.id = meal_ingredients.meal_id
      and meal.family_id = public.current_family_id()
      and public.is_parent_in_family(meal.family_id)
  )
);
