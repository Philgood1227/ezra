create table if not exists public.reward_consumptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  reward_tier_id uuid not null references public.reward_tiers (id) on delete cascade,
  quantity_used int not null check (quantity_used > 0),
  used_date date not null default (timezone('utc', now())::date),
  used_at timestamptz not null default timezone('utc', now())
);

create index if not exists reward_consumptions_family_child_tier_idx
  on public.reward_consumptions (family_id, child_profile_id, reward_tier_id);

create index if not exists reward_consumptions_child_tier_used_idx
  on public.reward_consumptions (child_profile_id, reward_tier_id, used_at desc);

alter table public.reward_consumptions enable row level security;

grant select, insert on table public.reward_consumptions to authenticated;
grant all on table public.reward_consumptions to service_role;

drop policy if exists "reward_consumptions_select_same_family" on public.reward_consumptions;
drop policy if exists "reward_consumptions_insert_parent_or_child_self" on public.reward_consumptions;

create policy "reward_consumptions_select_same_family"
on public.reward_consumptions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = reward_consumptions.family_id
      and (
        member.role = 'parent'
        or member.id = reward_consumptions.child_profile_id
      )
  )
);

create policy "reward_consumptions_insert_parent_or_child_self"
on public.reward_consumptions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = reward_consumptions.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = reward_consumptions.child_profile_id)
      )
  )
);
