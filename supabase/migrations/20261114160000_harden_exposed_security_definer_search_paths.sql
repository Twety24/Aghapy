create or replace function public.get_photos(p_album uuid)
returns table (id uuid, path text, status text, created_at timestamptz, uploader_name text, mine boolean)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.path, p.status, p.created_at,
         case when p.is_anonymous or p.uploaded_by is null then null else pr.full_name end,
         coalesce(p.uploaded_by = auth.uid(), false)
  from public.photos p
  left join public.profiles pr on pr.id = p.uploaded_by
  where p.album_id = p_album
    and (p.status = 'approved' or p.uploaded_by = auth.uid() or public.is_admin())
  order by p.created_at desc;
$$;

create or replace function public.group_chat(p_group uuid)
returns table (id uuid, body text, created_at timestamptz, sender_name text, mine boolean)
language sql
security definer
stable
set search_path = ''
as $$
  select *
  from (
    select m.id, m.body, m.created_at, pr.full_name,
           coalesce(m.sender_id = auth.uid(), false) as mine
    from public.group_messages m
    left join public.profiles pr on pr.id = m.sender_id
    where m.group_id = p_group
      and (public.is_admin() or public.is_group_member(p_group))
    order by m.created_at desc
    limit 200
  ) x
  order by x.created_at asc;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.mark_message_read(p_recipient_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.message_recipients
  set read_at = now()
  where id = p_recipient_id and user_id = auth.uid() and read_at is null;
$$;

create or replace function public.send_message(p_title text, p_body text, p_user_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid uuid;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then
    raise exception 'العنوان والرسالة مطلوبين';
  end if;
  insert into public.messages (title, body, sent_by)
  values (trim(p_title), trim(p_body), auth.uid())
  returning id into mid;
  insert into public.message_recipients (message_id, user_id)
  select mid, id
  from public.profiles
  where id = any (p_user_ids) and is_active;
  return mid;
end;
$$;
