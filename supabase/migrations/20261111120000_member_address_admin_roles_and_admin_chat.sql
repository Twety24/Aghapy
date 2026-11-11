-- Member addresses, three-tier admin permissions, targeted suggestions, and an automatic admin chat.
-- Existing admins remain normal admins unless they are the existing root account.

alter table public.profiles
  add column if not exists address text,
  add column if not exists admin_level text;

update public.profiles
set admin_level = case
  when is_root then 'super_admin'
  when role = 'admin' then 'admin'
  else null
end;

alter table public.profiles
  drop constraint if exists profiles_admin_level_check;
alter table public.profiles
  add constraint profiles_admin_level_check
  check (
    (role = 'member' and admin_level is null)
    or
    (role = 'admin' and admin_level in ('admin', 'senior_admin', 'super_admin'))
  );

create unique index if not exists profiles_single_root_idx
  on public.profiles (is_root)
  where is_root = true;

create or replace function public.is_senior_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and is_active
      and (is_root or admin_level in ('senior_admin', 'super_admin'))
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_root
      and role = 'admin'
      and is_active
  );
$$;

create or replace function public.protect_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_root boolean := false;
  actor_is_admin boolean := false;
begin
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(is_root, false), (role = 'admin' and is_active)
    into actor_is_root, actor_is_admin
  from public.profiles
  where id = auth.uid();

  if old.is_root or new.is_root is distinct from old.is_root then
    raise exception 'صلاحية Super Admin محجوزة للحساب الأساسي فقط';
  end if;

  if new.role is distinct from old.role
     or new.admin_level is distinct from old.admin_level then
    if actor_is_root then
      if new.admin_level = 'super_admin' then
        raise exception 'لا يمكن ترقية حساب آخر إلى Super Admin';
      end if;
      if new.role = 'member' then
        new.admin_level := null;
      elsif new.role = 'admin' and new.admin_level not in ('admin', 'senior_admin') then
        raise exception 'مستوى الأدمن غير صالح';
      end if;
    elsif actor_is_admin then
      if old.role <> 'member'
         or new.role <> 'admin'
         or new.admin_level <> 'admin' then
        raise exception 'الأدمن العادي يمكنه إضافة أدمن عادي فقط';
      end if;
    else
      raise exception 'غير مسموح بتغيير صلاحيات الأدمن';
    end if;
  end if;

  return new;
end;
$$;

-- Sensitive contact columns are never readable directly by authenticated clients.
-- The application serves them through server-side routes after checking admin_level.
revoke select on table public.profiles from anon, authenticated;
grant select (
  id, full_name, role, is_active, created_at, avatar_url, age,
  stage, department, is_root, birth_date
) on table public.profiles to authenticated;

-- Suggestions can be assigned to one or more active admins.
create table if not exists public.suggestion_recipients (
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, admin_id)
);
create index if not exists suggestion_recipients_admin_idx
  on public.suggestion_recipients (admin_id, created_at desc);

alter table public.suggestion_recipients enable row level security;
revoke all on table public.suggestion_recipients from anon, authenticated;

drop policy if exists "suggestions admin read" on public.suggestions;
create policy "suggestions assigned admin read"
  on public.suggestions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.suggestion_recipients sr
      where sr.suggestion_id = suggestions.id
        and sr.admin_id = (select auth.uid())
    )
    or (select public.is_super_admin())
  );

create or replace function public.get_active_suggestion_admins()
returns table (id uuid, full_name text)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.full_name
  from public.profiles p
  where p.role = 'admin'
    and p.is_active
  order by p.full_name;
$$;

create or replace function public.submit_suggestion(
  p_content text,
  p_is_anonymous boolean,
  p_admin_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  requested_count integer;
  valid_count integer;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;
  if char_length(trim(coalesce(p_content, ''))) not between 5 and 2000 then
    raise exception 'الاقتراح يجب أن يكون بين 5 و2000 حرف';
  end if;

  select count(distinct x) into requested_count
  from unnest(coalesce(p_admin_ids, array[]::uuid[])) as x;

  select count(distinct p.id) into valid_count
  from public.profiles p
  where p.id = any(coalesce(p_admin_ids, array[]::uuid[]))
    and p.role = 'admin'
    and p.is_active;

  if requested_count < 1 or requested_count <> valid_count then
    raise exception 'اختار مسؤولاً واحداً نشطاً على الأقل';
  end if;

  insert into public.suggestions (user_id, is_anonymous, content)
  values (
    case when coalesce(p_is_anonymous, false) then null else auth.uid() end,
    coalesce(p_is_anonymous, false),
    trim(p_content)
  )
  returning id into new_id;

  insert into public.suggestion_recipients (suggestion_id, admin_id)
  select new_id, p.id
  from public.profiles p
  where p.id = any(p_admin_ids)
    and p.role = 'admin'
    and p.is_active;

  return new_id;
end;
$$;

revoke all on function public.get_active_suggestion_admins() from public, anon;
grant execute on function public.get_active_suggestion_admins() to authenticated;
revoke all on function public.submit_suggestion(text, boolean, uuid[]) from public, anon;
grant execute on function public.submit_suggestion(text, boolean, uuid[]) to authenticated;

-- One system-managed group for the admin team. Membership is synced from active admin roles.
alter table public.groups
  add column if not exists is_admin_chat boolean not null default false;

create unique index if not exists groups_single_admin_chat_idx
  on public.groups (is_admin_chat)
  where is_admin_chat = true;

insert into public.groups (name, is_admin_chat)
values ('Admin Team', true)
on conflict do nothing;

insert into public.group_members (group_id, user_id)
select g.id, p.id
from public.groups g
cross join public.profiles p
where g.is_admin_chat
  and p.role = 'admin'
  and p.is_active
on conflict do nothing;

create or replace function public.is_admin_chat_group(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.groups
    where id = p_group_id and is_admin_chat
  );
$$;

create or replace function public.sync_admin_chat_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_group_id uuid;
begin
  select id into admin_group_id
  from public.groups
  where is_admin_chat
  limit 1;

  if admin_group_id is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    delete from public.group_members
    where group_id = admin_group_id and user_id = old.id;
    return old;
  end if;

  if new.role = 'admin' and new.is_active then
    insert into public.group_members (group_id, user_id)
    values (admin_group_id, new.id)
    on conflict do nothing;
  else
    delete from public.group_members
    where group_id = admin_group_id and user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_admin_chat_membership on public.profiles;
create trigger sync_admin_chat_membership
after insert or update of role, is_active, admin_level or delete
on public.profiles
for each row execute function public.sync_admin_chat_membership();

-- Prevent manual membership changes to the system admin group.
drop policy if exists "gm admin insert" on public.group_members;
drop policy if exists "gm admin delete" on public.group_members;
create policy "gm admin insert non-system"
  on public.group_members
  for insert
  to authenticated
  with check (
    (select public.is_admin())
    and not (select public.is_admin_chat_group(group_id))
  );
create policy "gm admin delete non-system"
  on public.group_members
  for delete
  to authenticated
  using (
    (select public.is_admin())
    and not (select public.is_admin_chat_group(group_id))
  );

-- Realtime keeps the selectable admin list and admin chat membership current in the UI.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end
$$;
