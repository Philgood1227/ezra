insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'revision-books',
  'revision-books',
  false,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "revision_books_storage_select_parent_only" on storage.objects;
drop policy if exists "revision_books_storage_insert_parent_only" on storage.objects;
drop policy if exists "revision_books_storage_update_parent_only" on storage.objects;
drop policy if exists "revision_books_storage_delete_parent_only" on storage.objects;

create policy "revision_books_storage_select_parent_only"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'revision-books'
  and split_part(name, '/', 1) = public.current_family_id()::text
  and public.is_parent_in_family(public.current_family_id())
);

create policy "revision_books_storage_insert_parent_only"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'revision-books'
  and split_part(name, '/', 1) = public.current_family_id()::text
  and public.is_parent_in_family(public.current_family_id())
);

create policy "revision_books_storage_update_parent_only"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'revision-books'
  and split_part(name, '/', 1) = public.current_family_id()::text
  and public.is_parent_in_family(public.current_family_id())
)
with check (
  bucket_id = 'revision-books'
  and split_part(name, '/', 1) = public.current_family_id()::text
  and public.is_parent_in_family(public.current_family_id())
);

create policy "revision_books_storage_delete_parent_only"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'revision-books'
  and split_part(name, '/', 1) = public.current_family_id()::text
  and public.is_parent_in_family(public.current_family_id())
);
