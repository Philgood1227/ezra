do $$
begin
  if to_regclass('public.notification_rules') is null then
    return;
  end if;

  with ranked as (
    select
      id,
      row_number() over (
        partition by family_id, child_profile_id, type
        order by created_at desc, id desc
      ) as row_rank
    from public.notification_rules
  )
  delete from public.notification_rules rules
  using ranked
  where rules.id = ranked.id
    and ranked.row_rank > 1;

  create unique index if not exists notification_rules_family_child_type_unique_idx
    on public.notification_rules (family_id, child_profile_id, type);
end $$;
