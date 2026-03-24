-- Reset complet des identifiants parent/enfant pour repartir a zero.
-- ATTENTION: ce script supprime TOUS les comptes auth et TOUTES les donnees du schema public.

begin;

do $$
declare
  public_tables text;
begin
  select string_agg(format('%I.%I', schemaname, tablename), ', ')
  into public_tables
  from pg_tables
  where schemaname = 'public';

  if public_tables is not null then
    execute 'truncate table ' || public_tables || ' restart identity cascade';
  end if;
end
$$;

-- Supprime tous les utilisateurs auth (parents + enfants).
delete from auth.users;

commit;

