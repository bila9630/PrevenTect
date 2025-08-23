-- Create a public storage bucket for claim image uploads
insert into storage.buckets (id, name, public)
values ('claims-uploads', 'claims-uploads', true);

-- Allow public read access to files in this bucket
create policy "Public read on claims-uploads"
on storage.objects for select
using (bucket_id = 'claims-uploads');

-- Allow public (anon) uploads to this bucket
create policy "Public insert on claims-uploads"
on storage.objects for insert
with check (bucket_id = 'claims-uploads');