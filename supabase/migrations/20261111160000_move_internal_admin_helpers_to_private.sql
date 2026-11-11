-- Keep internal authorization helpers outside the exposed Data API schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $private_super$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_root
      and role = 'admin'
      and is_active
  );
$private_super$;

create or replace function private.is_senior_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $private_senior$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and is_active
      and (is_root or admin_level = 'senior_admin')
  );
$private_senior$;

create or replace function private.is_admin_chat_group(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $private_group$
  select exists (
    select 1
    from public.groups
    where id = p_group_id
      and is_admin_chat
  );
$private_group$;

revoke all on function private.is_super_admin() from public, anon;
revoke all on function private.is_senior_admin() from public, anon;
revoke all on function private.is_admin_chat_group(uuid) from public, anon;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_senior_admin() to authenticated;
grant execute on function private.is_admin_chat_group(uuid) to authenticated;

drop policy if exists "suggestion recipients assigned read" on public.suggestion_recipients;
create policy "suggestion recipients assigned read"
  on public.suggestion_recipients
  for select
  to authenticated
  using (admin_id = (select auth.uid()) or (select private.is_super_admin()));

drop policy if exists "suggestions assigned admin read" on public.suggestions;
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
    or (select private.is_super_admin())
  );

drop policy if exists "gm admin insert non-system" on public.group_members;
create policy "gm admin insert non-system"
  on public.group_members
  for insert
  to authenticated
  with check (
    (select public.is_admin())
    and not (select private.is_admin_chat_group(group_id))
  );

drop policy if exists "gm admin delete non-system" on public.group_members;
create policy "gm admin delete non-system"
  on public.group_members
  for delete
  to authenticated
  using (
    (select public.is_admin())
    and not (select private.is_admin_chat_group(group_id))
  );

drop policy if exists "gm admin update non-system" on public.group_members;
create policy "gm admin update non-system"
  on public.group_members
  for update
  to authenticated
  using (
    (select public.is_admin())
    and not (select private.is_admin_chat_group(group_id))
  )
  with check (
    (select public.is_admin())
    and not (select private.is_admin_chat_group(group_id))
  );

drop function if exists public.get_active_suggestion_admins();
drop function if exists public.submit_suggestion(text, boolean, uuid[]);
drop function if exists public.is_admin_chat_group(uuid);
drop function if exists public.is_senior_admin();
drop function if exists public.is_super_admin();
