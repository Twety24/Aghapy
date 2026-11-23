-- DRAFT ONLY. This is NOT an executable production migration yet.
-- It is kept under docs/drafts deliberately. Do not move into supabase/migrations
-- or apply it until the full RLS/RPC/Storage migration and staging tests are ready.
--
-- Prerequisites:
--   * Clerk native third-party auth is configured in Supabase for the target project.
--   * A non-production staging database has been restored and tested.
--   * The legacy Auth user with no matching profile has been resolved manually.
--   * All application auth.uid() policies/RPCs have a reviewed replacement plan.
--
-- This draft preserves every existing profiles.id and every legacy auth.users row.
-- It does NOT create, link, delete, or update any real user records.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- One Clerk identity may map to one existing Aghapy profile, and vice versa.
create table private.clerk_profile_links (
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

-- The Clerk native Supabase integration verifies the JWT. This function trusts
-- only the JWT subject, never a user ID supplied by the browser.
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

-- Existing profiles currently have an FK to auth.users(id). Clerk-only profiles
-- cannot be inserted until that FK is removed. This step keeps all existing
-- auth.users records and the legacy on_auth_user_created trigger untouched.
-- Existing profile UUIDs are not regenerated or modified.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- Trusted server-only creation for a brand-new Clerk account.
-- Clerk's backend session/user verification MUST happen before calling this
-- function. EXECUTE is granted only to service_role, never browser roles.
-- Every new account is hard-coded to member, non-root, active, no admin tier.
create or replace function public.create_clerk_member_profile(
  p_clerk_user_id text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_address text,
  p_birth_date date,
  p_stage text,
  p_department text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_profile_id uuid;
  v_email text := lower(btrim(p_email));
  v_clerk_user_id text := btrim(p_clerk_user_id);
begin
  if v_clerk_user_id is null or char_length(v_clerk_user_id) not between 1 and 255 then
    raise exception 'Invalid Clerk user identifier';
  end if;

  if v_email is null or v_email = '' or position('@' in v_email) < 2 then
    raise exception 'A verified email is required';
  end if;

  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'Full name is required';
  end if;

  if p_address is null or char_length(btrim(p_address)) < 5 then
    raise exception 'A valid address is required';
  end if;

  if p_stage is not null and p_stage not in ('prep','secondary','university','graduated') then
    raise exception 'Invalid education stage';
  end if;

  if p_department is not null and p_department not in ('acting','scenography','media','music_prep','other') then
    raise exception 'Invalid department';
  end if;

  if exists (
    select 1 from public.profiles p
    where lower(btrim(p.email)) = v_email
  ) then
    raise exception 'An Aghapy profile already uses this email; link the existing profile instead';
  end if;

  if exists (
    select 1 from private.clerk_profile_links l
    where l.clerk_user_id = v_clerk_user_id
  ) then
    raise exception 'This Clerk account is already linked';
  end if;

  insert into public.profiles (
    id, full_name, email, phone, address, birth_date, stage, department,
    role, is_active, is_root, admin_level
  )
  values (
    gen_random_uuid(), btrim(p_full_name), v_email, nullif(btrim(p_phone), ''),
    btrim(p_address), p_birth_date, p_stage, p_department,
    'member', true, false, null
  )
  returning id into v_profile_id;

  insert into private.clerk_profile_links (clerk_user_id, profile_id)
  values (v_clerk_user_id, v_profile_id);

  return v_profile_id;
end;
$function$;

revoke all on function public.create_clerk_member_profile(text,text,text,text,text,date,text,text)
  from public, anon, authenticated;
grant execute on function public.create_clerk_member_profile(text,text,text,text,text,date,text,text)
  to service_role;

commit;

-- SECURITY / ROLLOUT NOTES:
-- 1. This function cannot itself prove the Clerk email is verified. The only
--    caller must be a server route that verifies the Clerk session/user via
--    Clerk's Backend API and checks primary email verification before calling.
-- 2. Do not accept p_clerk_user_id from a browser request. Derive it from the
--    verified Clerk session on the server.
-- 3. Existing-account linking must be a separate server-only workflow. It must
--    require exact normalized email equality, verified Clerk primary email,
--    confirmed legacy Supabase email, unique match, and an explicit exception
--    report. Never auto-link ambiguous or unprofiled accounts.
-- 4. This draft deliberately does not rewrite any RLS policy, RPC, trigger,
--    Storage policy, or service-role route. Cutover is unsafe until those are
--    migrated and tested as one coordinated release.
-- 5. The legacy auth.users trigger remains for any rollback / legacy path.
--    New Clerk profile creation bypasses auth.users and is handled above.
-- 6. The FK removal is a compatibility boundary. Test restoring a backup,
--    legacy sign-up, Clerk sign-up, rollback, and deletion semantics in staging.
-- 7. The profiles email unique constraint is case-sensitive. The function
--    additionally blocks a case/whitespace-normalized duplicate.
