alter table public.notifications drop constraint if exists notifications_notification_type_check;
update public.notifications set notification_type = 'announcement' where notification_type = 'message';
alter table public.notifications add constraint notifications_notification_type_check check (notification_type in ('announcement','meeting','photo','group_message'));
create or replace function private.notify_message_recipient()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m record;
begin
  select id, title, body into m from public.messages where id = new.message_id;
  if not found then return new; end if;
  perform private.create_user_notification(new.user_id,'announcement',m.title,left(m.body,180),'/messages#' || m.id::text,m.id,null);
  return new;
end;
$$;