-- DRAFT ONLY. Do not apply to production as-is.
-- This file documents the identity bridge for the Clerk migration.
-- It is intentionally outside supabase/migrations/ until the complete RLS,
-- trigger, FK, webhook, and rollback plan has been reviewed and tested.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists private.clerk_profile_links (
  clerk_user_id text primary key,
  profile_id uuid not null unique
    references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  linked_at timestamptz not null default now(),
  constraint clerk_profile_links_user_id_length
    check (char_length(clerk_user_id) between 1 and 255)
);

alter table private.clerk_profile_links enable row level security;
revoke all on private.clerk_profile_links from public, anon, authenticated;
grant all on private.clerk_profile_links to service_role;

create or replace function private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select link.profile_id
  from private.clerk_profile_links as link
  where link.clerk_user_id = (select auth.jwt() ->> 'sub')
  limit 1;
$function$;

revoke all on function private.current_profile_id() from public, anon;
grant execute on function private.current_profile_id() to authenticated, service_role;

commit;

-- Important constraints for the eventual complete migration:
-- 1. Enable Clerk as a native Supabase third-party auth provider before relying
--    on auth.jwt(); never use an unverified browser-supplied subject.
-- 2. Keep profile UUIDs stable. Do not rewrite attendance, messages, groups,
--    notifications, journal, or other foreign-key references.
-- 3. The current profiles.id -> auth.users.id FK prevents creating profiles
--    for Clerk-only users. A reviewed migration must deliberately address that
--    FK and the existing auth.users trigger before new Clerk registrations.
-- 4. Replace every member-ownership auth.uid() policy/function with
--    private.current_profile_id(), preserving the existing authorization
--    predicates and admin protections. This draft does not do that replacement.
-- 5. Only a verified server-side Clerk webhook/link flow may write this table.
--    Never expose mapping writes to authenticated browser clients.
-- 6. Existing email matches must be exact, unique, and verified on both sides.
--    The unmatched legacy auth user requires manual resolution; do not guess.
-- 7. This draft does not create profiles, map existing users, modify roles,
--    alter the profiles FK, or change any live database state.
