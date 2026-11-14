alter table public.reports
  add constraint reports_session_kind_key unique (session_id, kind);

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'avatars';

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
where id in ('gallery', 'meeting');

update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[]
where id = 'reports';
