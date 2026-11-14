create or replace function private.create_user_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_href text,
  p_source_id uuid,
  p_daily_verse_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications(
    user_id,
    notification_type,
    title,
    body,
    href,
    source_id
  )
  values (
    p_user_id,
    p_type,
    p_title,
    coalesce(p_body, ''),
    coalesce(p_href, '/dashboard'),
    p_source_id
  )
  on conflict do nothing;
end;
$$;

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
