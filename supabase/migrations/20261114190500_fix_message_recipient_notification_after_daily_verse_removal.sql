create or replace function private.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  select id, title, body
  into m
  from public.messages
  where id = new.message_id;

  if not found then
    return new;
  end if;

  perform private.create_user_notification(
    new.user_id,
    'message',
    m.title,
    left(m.body, 180),
    '/messages#' || m.id::text,
    m.id,
    null
  );

  return new;
end;
$$;
