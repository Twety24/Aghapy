-- Flatten Aghapy admin hierarchy: one protected Super Admin and equal regular Admins.
-- Normalize the existing Senior Admin into the regular Admin role.
update public.profiles
set admin_level = case when is_root then 'super_admin' when role = 'admin' then 'admin' else null end
where admin_level is distinct from case when is_root then 'super_admin' when role = 'admin' then 'admin' else null end;

alter table public.profiles drop constraint if exists profiles_admin_level_check;
alter table public.profiles add constraint profiles_admin_level_check
check (
  (role = 'member' and admin_level is null and not is_root)
  or (role = 'admin' and is_root and admin_level = 'super_admin')
  or (role = 'admin' and not is_root and admin_level = 'admin')
);

create or replace function public.protect_role_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_admin boolean := false;
begin
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(p.role = 'admin' and p.is_active, false)
    into actor_is_admin
  from public.profiles p
  where p.id = (select auth.uid());

  if new.is_root is distinct from old.is_root then
    raise exception 'صلاحية Super Admin محجوزة للحساب الأساسي فقط';
  end if;

  if old.is_root and (
    new.role is distinct from old.role
    or new.admin_level is distinct from old.admin_level
    or new.is_active is distinct from old.is_active
  ) then
    raise exception 'لا يمكن تغيير أو إيقاف حساب Super Admin';
  end if;

  if new.role is distinct from old.role
     or new.admin_level is distinct from old.admin_level then
    if not actor_is_admin then
      raise exception 'غير مسموح بتغيير صلاحيات الأدمن';
    end if;

    if new.role = 'member' then
      new.admin_level := null;
    elsif new.role = 'admin' and not new.is_root then
      new.admin_level := 'admin';
    elsif new.role = 'admin' and new.is_root then
      new.admin_level := 'super_admin';
    else
      raise exception 'مستوى الصلاحية غير صالح';
    end if;
  end if;

  return new;
end;
$$;

-- All active admins can read every suggestion and its routing metadata.
drop policy if exists "suggestions assigned admin read" on public.suggestions;
create policy "suggestions all admins read"
  on public.suggestions
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "suggestion recipients assigned read" on public.suggestion_recipients;
create policy "suggestion recipients all admins read"
  on public.suggestion_recipients
  for select
  to authenticated
  using ((select public.is_admin()));

drop function if exists private.is_senior_admin();
