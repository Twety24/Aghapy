-- Performance improvements for the expected ~130 concurrent users.
-- Add covering indexes for common filters, joins, ordering, and foreign keys.
create index if not exists attendance_records_user_id_idx on public.attendance_records(user_id);
create index if not exists attendance_records_session_status_checked_idx on public.attendance_records(session_id,status,checked_in_at desc);
create index if not exists attendance_sessions_created_by_idx on public.attendance_sessions(created_by);
create index if not exists birthday_message_log_message_id_idx on public.birthday_message_log(message_id);
create index if not exists email_log_session_id_idx on public.email_log(session_id);
create index if not exists group_members_user_id_idx on public.group_members(user_id);
create index if not exists group_messages_sender_id_idx on public.group_messages(sender_id);
create index if not exists message_recipients_user_id_idx on public.message_recipients(user_id);
create index if not exists messages_sent_by_idx on public.messages(sent_by);
create index if not exists photos_album_created_idx on public.photos(album_id,created_at desc);
create index if not exists photos_uploaded_by_idx on public.photos(uploaded_by);
create index if not exists reports_session_id_idx on public.reports(session_id);
create index if not exists suggestions_user_id_idx on public.suggestions(user_id);
create index if not exists profiles_full_name_idx on public.profiles(full_name);

-- Cache auth/admin checks per statement instead of recalculating them for every row.
alter policy "profiles read" on public.profiles using ((id = (select auth.uid())) or (select public.is_admin()));
alter policy "profiles update" on public.profiles using ((id = (select auth.uid())) or (select public.is_admin())) with check ((id = (select auth.uid())) or (select public.is_admin()));
alter policy "records read" on public.attendance_records using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy "sessions admin" on public.attendance_sessions using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "settings admin" on public.settings using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "suggestions admin read" on public.suggestions using ((select public.is_admin()));
alter policy "suggestions insert" on public.suggestions with check ((is_anonymous and user_id is null) or ((not is_anonymous) and user_id = (select auth.uid())));
alter policy "messages read" on public.messages using ((select public.is_admin()) or exists (select 1 from public.message_recipients r where r.message_id = messages.id and r.user_id = (select auth.uid())));
alter policy "messages admin write" on public.messages using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "recipients read" on public.message_recipients using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy "recipients admin write" on public.message_recipients using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "excuses read" on public.excuses using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy "excuses insert" on public.excuses with check (user_id = (select auth.uid()));
alter policy "excuses update" on public.excuses using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "photos read" on public.photos using ((status = 'approved') or (uploaded_by = (select auth.uid())) or (select public.is_admin()));
alter policy "photos insert" on public.photos with check ((uploaded_by = (select auth.uid())) and ((status = 'pending') or (select public.is_admin())));
alter policy "photos update" on public.photos using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "photos delete admin only" on public.photos using ((select public.is_admin()));
alter policy "albums admin" on public.albums using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "groups read" on public.groups using ((select public.is_admin()) or (select public.is_group_member(id)));
alter policy "groups admin" on public.groups using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "gm read" on public.group_members using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy "gm admin" on public.group_members using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "gmsg read" on public.group_messages using ((select public.is_admin()) or (select public.is_group_member(group_id)));
alter policy "gmsg insert" on public.group_messages with check ((sender_id = (select auth.uid())) and ((select public.is_admin()) or (select public.is_group_member(group_id))));
alter policy "gmsg admin delete" on public.group_messages using ((select public.is_admin()));
alter policy "meeting read" on public.meeting_content using (true);
alter policy "meeting admin" on public.meeting_content using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "reports admin" on public.reports using ((select public.is_admin()));
alter policy "email_log admin" on public.email_log using ((select public.is_admin()));

-- Realtime replaces five-second polling for group chats and attendance lists.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='group_messages') then
    alter publication supabase_realtime add table public.group_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='attendance_records') then
    alter publication supabase_realtime add table public.attendance_records;
  end if;
end
$$;
