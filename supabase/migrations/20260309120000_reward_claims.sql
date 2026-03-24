create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  reward_tier_id uuid not null references public.reward_tiers (id) on delete cascade,
  points_spent int not null check (points_spent >= 0),
  claim_date date not null default (timezone('utc', now())::date),
  claimed_at timestamptz not null default timezone('utc', now())
);

create index if not exists reward_claims_family_child_date_idx
  on public.reward_claims (family_id, child_profile_id, claim_date);

create index if not exists reward_claims_child_tier_claimed_idx
  on public.reward_claims (child_profile_id, reward_tier_id, claimed_at desc);

alter table public.reward_claims enable row level security;

grant select, insert on table public.reward_claims to authenticated;
grant all on table public.reward_claims to service_role;

drop policy if exists "reward_claims_select_same_family" on public.reward_claims;
drop policy if exists "reward_claims_insert_parent_or_child_self" on public.reward_claims;

create policy "reward_claims_select_same_family"
on public.reward_claims
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = reward_claims.family_id
      and (
        member.role = 'parent'
        or member.id = reward_claims.child_profile_id
      )
  )
);

create policy "reward_claims_insert_parent_or_child_self"
on public.reward_claims
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.family_id = reward_claims.family_id
      and (
        member.role = 'parent'
        or (member.role = 'child' and member.id = reward_claims.child_profile_id)
      )
  )
);
