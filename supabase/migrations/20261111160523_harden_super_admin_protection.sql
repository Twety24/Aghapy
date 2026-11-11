-- Enforce the Super Admin protection even for trusted server-side/service-role updates.
create or replace function public.protect_role_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_admin boolean := false;
begin
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

  if auth.uid() is null then
    return new;
  end if;

  select coalesce(p.role = 'admin' and p.is_active, false)
    into actor_is_admin
  from public.profiles p
  where p.id = (select auth.uid());

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

create or replace function public.prevent_super_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_root then
    raise exception 'لا يمكن حذف حساب Super Admin الأساسي';
  end if;
  return old;
end;
$$;

revoke all on function public.protect_role_changes() from public, anon, authenticated;
revoke all on function public.prevent_super_admin_delete() from public, anon, authenticated;

drop trigger if exists prevent_super_admin_delete on public.profiles;
create trigger prevent_super_admin_delete
before delete on public.profiles
for each row execute function public.prevent_super_admin_delete();
