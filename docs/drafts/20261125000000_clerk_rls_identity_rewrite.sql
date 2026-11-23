-- DRAFT ONLY. Generated from a read-only inspection of the live policy/function
-- definitions. Do not apply before staging restore, JWT issuer verification,
-- and review of the full app/API migration.
--
-- Preserves current policy predicates by replacing only auth.uid() identity
-- expressions with private.current_profile_id(). It does not change roles,
-- table scope, command, permissive/restrictive mode, or admin predicates.

begin;

-- Identity-aware helpers. The mapping helper returns NULL for an unknown Clerk
-- subject; legacy Supabase sessions retain their original UUID subject.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.profiles
    where id = private.current_profile_id() and role = 'admin' and is_active
  );
$function$;

create or replace function private.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = private.current_profile_id()
  );
$function$;

-- Preserve public wrappers used by existing policies and clients.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $function$
  select private.is_admin();
$function$;

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
set search_path = ''
as $function$
  select private.is_group_member(gid);
$function$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = (select private.current_profile_id())
      and is_root
      and role = 'admin'
      and is_active
  );
$function$;

-- Rebuild every existing public/storage policy whose expression directly uses
-- auth.uid(). The policy's original roles, command, mode and remaining
-- expression are preserved. Only the identity function call is substituted.
do $policy_rewrite$
declare
  p record;
  v_roles text;
  v_command text;
  v_sql text;
begin
  for p in
    select *
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
      )
  loop
    select string_agg(
      case when r.role_name = 'public' then 'public' else quote_ident(r.role_name) end,
      ', ' order by r.ordinality
    )
    into v_roles
    from unnest(p.roles) with ordinality as r(role_name, ordinality);

    v_command := case p.cmd
      when 'SELECT' then 'SELECT'
      when 'INSERT' then 'INSERT'
      when 'UPDATE' then 'UPDATE'
      when 'DELETE' then 'DELETE'
      when 'ALL' then 'ALL'
      else null
    end;

    if v_command is null or v_roles is null then
      raise exception 'Unsupported policy metadata for %.%', p.schemaname, p.policyname;
    end if;

    execute format(
      'drop policy %I on %I.%I',
      p.policyname, p.schemaname, p.tablename
    );

    v_sql := format(
      'create policy %I on %I.%I as %s for %s to %s',
      p.policyname,
      p.schemaname,
      p.tablename,
      lower(p.permissive),
      v_command,
      v_roles
    );

    if p.qual is not null then
      v_sql := v_sql || ' using (' ||
        replace(p.qual, 'auth.uid()', 'private.current_profile_id()') || ')';
    end if;

    if p.with_check is not null then
      v_sql := v_sql || ' with check (' ||
        replace(p.with_check, 'auth.uid()', 'private.current_profile_id()') || ')';
    end if;

    execute v_sql;
  end loop;
end;
$policy_rewrite$;

-- Trigger functions use actor identity, not target-row identity. Keep all
-- existing invariants and replace only the authenticated actor lookup.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if private.current_profile_id() is not null then
    new.id := old.id; new.email := old.email; new.is_root := old.is_root;
    if not public.is_admin() then new.role := old.role; new.is_active := old.is_active; end if;
  end if;
  return new;
end $function$;

create or replace function public.protect_role_changes()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
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

  if private.current_profile_id() is null then
    return new;
  end if;

  select coalesce(p.role = 'admin' and p.is_active, false)
    into actor_is_admin
  from public.profiles p
  where p.id = (select private.current_profile_id());

  if actor_is_admin and private.current_profile_id() = old.id and (
    new.role is distinct from old.role
    or new.admin_level is distinct from old.admin_level
    or new.is_active is distinct from old.is_active
  ) then
    raise exception 'لا يمكن تغيير صلاحيات حسابك بنفسك';
  end if;

  if actor_is_admin and old.role = 'admin'
     and new.is_active is distinct from old.is_active then
    raise exception 'إزالة صلاحية الأدمن تتم من خلال تغيير الرتبة فقط';
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
$function$;

-- RPC definitions below preserve the live definitions; only auth.uid() identity lookups are replaced.
create or replace function public.get_photos(p_album uuid)
returns table(id uuid, path text, status text, created_at timestamp with time zone, uploader_name text, mine boolean)
language sql
stable
security definer
set search_path to ''
as $function$
  select p.id, p.path, p.status, p.created_at,
         case when p.is_anonymous or p.uploaded_by is null then null else pr.full_name end,
         coalesce(p.uploaded_by = private.current_profile_id(), false)
  from public.photos p
  left join public.profiles pr on pr.id = p.uploaded_by
  where p.album_id = p_album
    and (p.status = 'approved' or p.uploaded_by = private.current_profile_id() or public.is_admin())
  order by p.created_at desc;
$function$;

create or replace function public.group_chat(p_group uuid)
returns table(id uuid, body text, created_at timestamp with time zone, sender_name text, mine boolean)
language sql
stable
security definer
set search_path to ''
as $function$
  select *
  from (
    select m.id, m.body, m.created_at, pr.full_name,
           coalesce(m.sender_id = private.current_profile_id(), false) as mine
    from public.group_messages m
    left join public.profiles pr on pr.id = m.sender_id
    where m.group_id = p_group
      and (public.is_admin() or public.is_group_member(p_group))
    order by m.created_at desc
    limit 200
  ) x
  order by x.created_at asc;
$function$;

create or replace function public.mark_message_read(p_recipient_id uuid)
returns void
language sql
security definer
set search_path to ''
as $function$
  update public.message_recipients
  set read_at = now()
  where id = p_recipient_id and user_id = private.current_profile_id() and read_at is null;
$function$;

create or replace function public.send_message(p_title text, p_body text, p_user_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
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
  values (trim(p_title), trim(p_body), private.current_profile_id())
  returning id into mid;
  insert into public.message_recipients (message_id, user_id)
  select mid, id
  from public.profiles
  where id = any (p_user_ids) and is_active;
  return mid;
end;
$function$;

commit;

-- REQUIRED REVIEW / TESTS BEFORE EXECUTION:
-- A. Verify the exact legacy Supabase JWT issuer and Clerk JWT issuer in staging.
-- B. The policy-rewrite DO block must be tested against a restored copy and its
--    resulting pg_policies output diffed against the pre-migration snapshot.
-- C. Confirm every policy using auth.uid() was rewritten; policies relying only
--    on is_admin()/is_group_member() are covered by helper replacement above.
-- D. Storage policies use profile UUID as the first folder segment after this
--    change; do not rename existing object paths or bucket contents.
-- E. Audit EXECUTE grants on SECURITY DEFINER RPCs separately. This draft does
--    not change grants and does not widen access.
-- F. The live catalog inspection found the six public and three private auth.uid()-dependent functions listed in the audit. Re-run the inventory after implementation to catch newly added functions.
-- G. The send_message/group_chat/get_photos/mark_message_read RPC signatures
--    are preserved; client-supplied sender IDs must not be trusted.
