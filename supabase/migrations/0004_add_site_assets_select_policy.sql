-- site-assets never got an explicit storage.objects SELECT policy -- reads
-- were assumed to bypass RLS via the bucket's public=true flag, but
-- authenticated upload/upsert operations still need a SELECT policy to
-- check for an existing object, causing "new row violates row-level
-- security policy" on upload even though the bucket is public.
-- Run once in the Supabase SQL Editor. Safe to re-run.

drop policy if exists site_assets_bucket_select on storage.objects;
create policy site_assets_bucket_select on storage.objects for select using (bucket_id = 'site-assets');
