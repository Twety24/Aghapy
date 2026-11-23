# Aghapy Clerk migration: audit and implementation notes

Status: planning/audit only. This document is on `feature/clerk-auth-migration`. No production code, database schema, Clerk production configuration, or Vercel deployment has been changed.

## Confirmed application facts

- Next.js 16.4.5, React 19.
- Current auth package is Supabase SSR; `@clerk/nextjs` is not installed.
- `proxy.js` authenticates requests through Supabase `getClaims()`.
- `lib/guard.js` uses Supabase `getUser()` and then reads `profiles` to authorize admins.
- Login and registration use Supabase Auth directly. Registration metadata includes name, phone, address, birth date, stage, department; optional avatar upload is performed after signup.
- Forgot/reset password and OAuth callback routes also belong to the migration surface.
- 15 API route handlers were identified, including admin member changes, reports, Gmail OAuth, attendance check-in, session management, cron processing, and suggestions.
- Authenticated pages/components also read Supabase user IDs directly (dashboard, profile, chats, excuses, photos, messages, suggestions, group chat, profile form, and notifications).
- Several privileged routes use a server-only Supabase service-role client. These routes must independently verify Clerk identity and current profile permissions before using the bypass client.
- Existing member and historical record IDs are UUIDs and are referenced by foreign keys throughout the schema. Those IDs must remain stable.

## Database audit findings (read-only)

- `auth.users`: 48 rows.
- Confirmed email addresses: 48 of 48.
- `public.profiles`: 47 rows at the time of the initial count.
- One auth user has no matching profile. No profile row was found without a matching auth user.
- The `on_auth_user_created` AFTER INSERT trigger is currently installed and calls `public.handle_new_user()`; the reason this existing auth row has no profile is still unknown (for example, it may predate the current trigger state or its profile may have been removed later). The audit has not established which explanation is correct.
- This unmatched account is not to be deleted, silently linked, or guessed. It needs a deliberate resolution path before cutover.
- Public RLS policies directly use `auth.uid()` for member ownership in attendance, excuses, group membership/messages, message recipients, notifications, photos, profiles, and spiritual journal entries.
- Confirmed private identity helpers are `private.is_admin()`, `private.is_group_member()`, and `private.is_super_admin()`. `private.is_admin_chat_group(uuid)` checks group metadata rather than caller identity. The earlier mention of `private.is_senior_admin()` was not confirmed in the live catalog and must not be treated as an existing function.
- Security-definer functions also use `auth.uid()`: `send_message`, `get_photos`, `group_chat`, `mark_message_read`, `protect_profile_columns`, and `protect_role_changes`.
- The deployed database migration history contains `20261123201843 spiritual_journal_entries`, which was not present in the inspected repository migration tree. Reconcile this drift before any database migration.

## Identity architecture to implement

1. Clerk is the only interactive identity provider after cutover. Supabase remains the database and storage service.
2. Preserve every existing `profiles.id` UUID and every existing foreign-key relationship.
3. Add a private mapping table from immutable Clerk user ID (text) to existing/new profile UUID. Enforce uniqueness on both columns.
4. Derive the active profile UUID only from the verified Clerk JWT subject (`auth.jwt()->>'sub'`) through a private, security-definer helper with a fixed empty search_path. Never accept a profile UUID from browser input as proof of identity.
5. Use Clerk's current native Supabase third-party auth integration, not the deprecated shared Supabase JWT-secret template. Supabase policies can read the verified Clerk subject from `auth.jwt()`.
6. Replace UUID ownership checks in RLS and identity-sensitive database functions with the private mapped-profile helper. Preserve all existing access rules, including the protected Super Admin model.
7. For new Clerk registrations, use a verified Clerk webhook or equivalent server-verified flow to create the profile and mapping atomically. Ignore client-supplied role/admin flags; new users always start as members.
8. For existing accounts, link only after Clerk confirms ownership of the exact normalized email and the existing Supabase email is confirmed. The database audit showed all 48 existing auth emails are confirmed. Do not link the unmatched auth user until its intended profile/account outcome is explicitly resolved.
9. Existing `profiles.id` currently has a foreign key to `auth.users(id)`. A Clerk-only profile cannot be created while that FK remains. Any future migration must deliberately replace/remove that FK only after confirming all relevant triggers and dependencies, while retaining existing profile UUIDs and old auth records as historical data.
10. Do not use the Supabase service-role key for normal member reads/writes. Where service role is required for server-only operations, verify the Clerk session and permissions first, then constrain the operation to the verified mapped profile.

## Required cutover work

- Install and configure the compatible Clerk Next.js SDK and provider.
- Replace Supabase Auth proxy/session logic with Clerk middleware/proxy and Clerk server auth.
- Replace login, registration, Google sign-in, logout, forgot-password, reset-password, and callback flows.
- Implement verified identity mapping and a safe existing-account linking path.
- Update every server page, client component, route handler, and helper currently calling Supabase Auth.
- Rewrite RLS policies and security-definer functions to use mapped profile identity.
- Review storage policies separately; profile/avatar ownership paths currently use UUIDs.
- Preserve member fields, profile photo, admin roles, attendance, group memberships, messages, notifications, suggestions, excuses, and spiritual journal data.

## Security and regression tests required before preview

- Anonymous requests cannot read private member data or call protected routes.
- Member A cannot read or mutate Member B's profile, attendance, excuses, notifications, journal entries, or private messages.
- A member cannot forge a profile UUID or Clerk subject in request JSON/headers.
- New signups cannot set admin, root, role, or active status.
- Admins retain current allowed actions over regular admins, but cannot modify, demote, disable, or create another Super Admin.
- Super Admin remains the single protected root account.
- QR check-in writes against the mapped legacy profile UUID and preserves duplicate-check-in protection.
- Group chat, admin chat, messages, notification delivery, photo upload/read/delete, reports, Gmail OAuth, and scheduled session closure continue to work.
- Existing users link to the same UUIDs; no duplicate profiles are created.
- Invalid, revoked, expired, or unmapped Clerk sessions fail closed.
- Build and type/lint checks pass, then run preview end-to-end tests before requesting production approval.

## Official integration reference

- Clerk + Supabase guide: https://clerk.com/docs/guides/development/integrations/databases/supabase
- Supabase Clerk third-party auth guide: https://supabase.com/docs/guides/auth/third-party/clerk

The native third-party integration is preferred. The older Clerk JWT-template integration is deprecated.


## Follow-up database dependency review (read-only)

- The live catalog currently exposes nine public/private functions whose source directly references `auth.uid()`: `private.is_admin`, `private.is_group_member`, `private.is_super_admin`, `public.get_photos`, `public.group_chat`, `public.mark_message_read`, `public.protect_profile_columns`, `public.protect_role_changes`, and `public.send_message`.
- The profile protection trigger set also includes `prevent_super_admin_delete`, `protect_last_admin`, `sync_admin_chat_membership`, and `sync_profile_age_from_birth_date`. The first three are authorization/role-sensitive and must be reviewed alongside mapped identity changes; the age trigger is not an auth identity dependency.
- All 21 application tables in the inspected public schema have RLS enabled. The live policy inventory includes 7 Storage object policies in addition to the public-table policies. RLS must remain enabled throughout migration.
- Storage object ownership currently compares the first folder segment to auth.uid()::text for avatar delete/insert and gallery upload. Those path checks must be migrated to the mapped legacy profile UUID (or an equivalently strict server-owned path design). Admin-only gallery/meeting policies use is_admin().
- The profile FK to auth.users(id) is the only application FK found targeting auth.users; the other listed FKs are internal Supabase Auth relationships. Do not alter internal Auth constraints. Any profile FK change must be isolated and reviewed as a deliberate compatibility boundary.
- Re-count confirmed during this follow-up: 48 Auth users, 47 profiles, exactly one Auth user without a profile, and zero profiles without an Auth user.
- The deployed migration ledger contains 33 entries in the current read. Its latest entry is 20261123201843 spiritual_journal_entries. The repository migration directory must be reconciled against this ledger before creating an executable migration; no migration has been applied.
- The installed package manifest and lockfile currently do not include @clerk/nextjs. No dependency changes have been made.

## Additional implementation constraints

- Do not rewrite Storage policies by broad text replacement: preserve each bucket's current permissions and map the folder owner to the profile UUID derived from the verified Clerk subject.
- Preserve trigger behavior that prevents Super Admin deletion, protects the last active admin, and synchronizes admin-chat membership. Test role changes and membership synchronization after changing the identity helper.
- Keep the existing Supabase Auth records intact during the initial migration. The FK issue is limited to the application profile table; there is no justification to delete or rewrite legacy Auth users as part of the Clerk cutover.
- The prior GitHub code-search endpoint returned default-branch matches, not branch-pinned results. Treat those search hits as discovery hints only; implementation review must use files fetched from feature/clerk-auth-migration.


## Live policy coverage captured for migration planning

Identity-sensitive public policies in the live catalog include: attendance_records; excuses (insert/read/update); group_members (read); group_messages (insert); groups (read); message_recipients (read); messages (read); notification_preferences (own insert/select/update); notifications (own delete/select/update); photos (insert/read); profiles (read/update); and spiritual_journal_entries (own delete/insert/read/update). Admin-only policies generally call `is_admin()` and must remain behaviorally equivalent after the identity bridge.

Storage policies currently comprise: avatars own insert/delete; gallery own insert and admin delete; meeting admin insert/delete; and team-files read for the three buckets. The own-folder checks compare the first path segment with `auth.uid()::text`; preserve that exact ownership boundary after migration. Public-read policies on albums, meeting content, and the team-files bucket are not identity checks and should not be needlessly rewritten.

## Important distinction found in trigger logic

`protect_profile_columns()` and `protect_role_changes()` use the authenticated actor identity, so their checks must resolve the Clerk subject to the existing profile UUID. `prevent_super_admin_delete()` and `protect_last_admin()` protect row invariants independent of the caller identity and should retain their current invariant logic. `sync_admin_chat_membership()` maintains the admin group based on the target profile's role and active state; it should not be changed to derive the target user from the actor identity.

## Authentication flow findings from branch-pinned code

The current login and registration pages call Supabase Auth directly. Registration relies on the `auth.users` trigger to create `profiles`, stores signup fields in Supabase user metadata, and uploads an avatar under a path beginning with the Supabase user UUID. Password reset and email callback also rely on Supabase Auth. The server guard and request proxy likewise read Supabase sessions. Therefore Clerk migration must replace all of these together with a staged compatibility path; simply swapping the login form is insufficient.


## Clerk production configuration re-check (read-only, 2026-11-23)

- Production instance confirms email is required and verified at sign-up. Email sign-in strategy is currently `email_code` only.
- Password authentication is enabled and required, with a configured minimum length of 15 characters. The sign-in strategy list for email does not include password because Clerk models password authentication separately from email-code/link strategies. The UI migration must be tested against the actual Clerk sign-in flow; do not infer the final sign-in screen from the email strategy array alone.
- Google OAuth is marked enabled, but the production `client_id` and `client_secret` fields are empty. Google sign-in cannot be considered ready until valid credentials are configured.
- No Clerk configuration was changed during this read. Apple sign-in remains out of scope.
- Existing Supabase password credentials must not be assumed to transfer automatically. The migration needs a verified account-claim / password-setup plan for existing users. Do not promise seamless password continuity until the actual password-hash import compatibility and account migration path are validated.
