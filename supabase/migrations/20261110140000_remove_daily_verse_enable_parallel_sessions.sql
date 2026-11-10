do $$
declare j bigint;
begin
 select jobid into j from cron.job where jobname='aghapy-daily-verse';
 if j is not null then perform cron.unschedule(j); end if;
end $$;
drop function if exists private.publish_daily_verse();
delete from public.message_recipients where message_id in (select id from public.messages where daily_verse_id is not null);
delete from public.notifications where notification_type='daily_verse' or daily_verse_id is not null;
delete from public.messages where daily_verse_id is not null;
alter table public.messages drop constraint if exists messages_daily_verse_id_fkey;
drop index if exists public.messages_daily_verse_idx;
alter table public.messages drop column if exists daily_verse_id;
alter table public.notifications drop constraint if exists notifications_daily_verse_id_fkey;
alter table public.notifications drop column if exists daily_verse_id;
alter table public.notifications drop constraint if exists notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check check (notification_type = any(array['message','meeting','photo','group_message']));
drop table if exists public.daily_verse_saves cascade;
drop table if exists public.daily_verses cascade;
drop table if exists public.daily_verse_library cascade;
alter table public.attendance_sessions drop constraint if exists attendance_sessions_meeting_date_key;
alter table public.attendance_sessions add column if not exists title text;
alter table public.attendance_sessions add column if not exists location text;
update public.attendance_sessions set title='اجتماع' where title is null;
update public.attendance_sessions set location='غير محدد' where location is null;
alter table public.attendance_sessions alter column title set not null;
alter table public.attendance_sessions alter column location set not null;
create index if not exists attendance_sessions_starts_at_idx on public.attendance_sessions(starts_at desc);
create index if not exists attendance_sessions_status_ends_at_idx on public.attendance_sessions(status,ends_at);