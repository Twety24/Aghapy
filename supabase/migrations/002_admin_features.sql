-- Run once in Supabase > SQL Editor (after 001)

-- 1) never allow removing/suspending the last active admin
create or replace function public.protect_last_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and old.is_active and (new.role <> 'admin' or not new.is_active) then
    if not exists (select 1 from public.profiles where role = 'admin' and is_active and id <> old.id) then
      raise exception 'لازم يفضل أدمن واحد فعّال على الأقل';
    end if;
  end if;
  return new;
end $$;
create trigger protect_last_admin before update on public.profiles
  for each row execute function public.protect_last_admin();

-- 2) atomic "send message to selected members"
create or replace function public.send_message(p_title text, p_body text, p_user_ids uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then raise exception 'العنوان والرسالة مطلوبين'; end if;
  insert into public.messages (title, body, sent_by) values (trim(p_title), trim(p_body), auth.uid()) returning id into mid;
  insert into public.message_recipients (message_id, user_id)
    select mid, id from public.profiles where id = any (p_user_ids) and is_active;
  return mid;
end $$;
revoke all on function public.send_message(text, text, uuid[]) from public, anon;
grant execute on function public.send_message(text, text, uuid[]) to authenticated;

-- 3) private bucket for the weekly Excel reports
insert into storage.buckets (id, name, public) values ('reports', 'reports', false) on conflict do nothing;
