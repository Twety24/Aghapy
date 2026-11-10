-- Query/index improvements for the expected peak of approximately 130 concurrent users.
-- Every index starts with the FK/filter column used by the app.
create index if not exists attendance_records_user_id_idx on public.attendance_records(user_id);
create index if not exists attendance_records_session_status_checked_idx on public.attendance_records(session_id,status,checked_in_at desc);
create index if not exists attendance_sessions_created_by_idx on public.attendance_sessions(created_by);
create index if not exists birthday_message_log_message_id_idx on public.birthday_message_log(message_id);
create index if not exists email_log_session_created_idx on public.email_log(session_id,created_at desc);
create index if not exists group_members_user_id_idx on public.group_members(user_id);
create index if not exists group_messages_sender_id_idx on public.group_messages(sender_id);
create index if not exists message_recipients_user_id_idx on public.message_recipients(user_id);
create index if not exists messages_sent_by_idx on public.messages(sent_by);
create index if not exists messages_created_at_idx on public.messages(created_at desc);
create index if not exists photos_album_created_idx on public.photos(album_id,created_at desc);
create index if not exists photos_uploaded_by_idx on public.photos(uploaded_by);
create index if not exists reports_session_kind_idx on public.reports(session_id,kind);
create index if not exists suggestions_user_id_idx on public.suggestions(user_id);
create index if not exists suggestions_created_at_idx on public.suggestions(created_at desc);
create index if not exists profiles_active_idx on public.profiles(id) where is_active = true;

-- Evaluate auth and admin helper calls once per statement rather than once per row.
alter policy "profiles read" on public.profiles to authenticated using ((id = (select auth.uid())) or (select public.is_admin()));
alter policy "profiles update" on public.profiles to authenticated using ((id = (select auth.uid())) or (select public.is_admin())) with check ((id = (select auth.uid())) or (select public.is_admin()));
alter policy "records read" on public.attendance_records to authenticated using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy "sessions admin" on public.attendance_sessions to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "settings admin" on public.settings to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "suggestions admin read" on public.suggestions to authenticated using ((select public.is_admin()));
alter policy "suggestions insert" on public.suggestions to authenticated with check ((is_anonymous and user_id is null) or ((not is_anonymous) and user_id = (select auth.uid())));
alter policy "messages read" on public.messages to authenticated using ((select public.is_admin()) or exists (select 1 from public.message_recipients r where r.message_id = messages.id and r.user_id = (select auth.uid())));
alter policy "recipients read" on public.message_recipients to authenticated using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy "excuses read" on public.excuses to authenticated using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy "excuses insert" on public.excuses to authenticated with check (user_id = (select auth.uid()));
alter policy "excuses update" on public.excuses to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "photos read" on public.photos to authenticated using ((status = 'approved') or (uploaded_by = (select auth.uid())) or (select public.is_admin()));
alter policy "photos insert" on public.photos to authenticated with check ((uploaded_by = (select auth.uid())) and ((status = 'pending') or (select public.is_admin())));
alter policy "photos update" on public.photos to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "photos delete admin only" on public.photos to authenticated using ((select public.is_admin()));
alter policy "albums read" on public.albums to authenticated using (true);
alter policy "groups read" on public.groups to authenticated using ((select public.is_admin()) or (select public.is_group_member(id)));
alter policy "gm read" on public.group_members to authenticated using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy "gmsg read" on public.group_messages to authenticated using ((select public.is_admin()) or (select public.is_group_member(group_id)));
alter policy "gmsg insert" on public.group_messages to authenticated with check ((sender_id = (select auth.uid())) and ((select public.is_admin()) or (select public.is_group_member(group_id))));
alter policy "gmsg admin delete" on public.group_messages to authenticated using ((select public.is_admin()));
alter policy "meeting read" on public.meeting_content to authenticated using (true);
alter policy "reports admin" on public.reports to authenticated using ((select public.is_admin()));
alter policy "email_log admin" on public.email_log to authenticated using ((select public.is_admin()));

-- Split admin ALL policies so SELECT is evaluated by one policy only.
drop policy if exists "albums admin" on public.albums;
create policy "albums admin insert" on public.albums for insert to authenticated with check ((select public.is_admin()));
create policy "albums admin update" on public.albums for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "albums admin delete" on public.albums for delete to authenticated using ((select public.is_admin()));

drop policy if exists "groups admin" on public.groups;
create policy "groups admin insert" on public.groups for insert to authenticated with check ((select public.is_admin()));
create policy "groups admin update" on public.groups for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "groups admin delete" on public.groups for delete to authenticated using ((select public.is_admin()));

drop policy if exists "gm admin" on public.group_members;
create policy "gm admin insert" on public.group_members for insert to authenticated with check ((select public.is_admin()));
create policy "gm admin update" on public.group_members for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "gm admin delete" on public.group_members for delete to authenticated using ((select public.is_admin()));

drop policy if exists "messages admin write" on public.messages;
create policy "messages admin insert" on public.messages for insert to authenticated with check ((select public.is_admin()));
create policy "messages admin update" on public.messages for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "messages admin delete" on public.messages for delete to authenticated using ((select public.is_admin()));

drop policy if exists "recipients admin write" on public.message_recipients;
create policy "recipients admin insert" on public.message_recipients for insert to authenticated with check ((select public.is_admin()));
create policy "recipients admin update" on public.message_recipients for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "recipients admin delete" on public.message_recipients for delete to authenticated using ((select public.is_admin()));

drop policy if exists "meeting admin" on public.meeting_content;
create policy "meeting admin insert" on public.meeting_content for insert to authenticated with check ((select public.is_admin()));
create policy "meeting admin update" on public.meeting_content for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "meeting admin delete" on public.meeting_content for delete to authenticated using ((select public.is_admin()));

-- Realtime replaces periodic polling for group chats and attendance lists.
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
