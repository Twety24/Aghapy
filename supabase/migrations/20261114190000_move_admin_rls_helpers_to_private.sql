create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function private.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

revoke all on function private.is_admin() from public, anon;
revoke all on function private.is_group_member(uuid) from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.is_group_member(uuid) to authenticated, service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin();
$$;

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_group_member(gid);
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_group_member(uuid) to authenticated, service_role;
