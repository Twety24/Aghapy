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
- This unmatched account is not to be deleted, silently linked, or guessed. It needs a deliberate resolution path before cutover.
- Public RLS policies directly use `auth.uid()` for member ownership in attendance, excuses, group membership/messages, message recipients, notifications, photos, profiles, and spiritual journal entries.
- Existing private admin helpers `private.is_admin()`, `private.is_group_member()`, `private.is_super_admin()`, `private.is_senior_admin()`, and `private.is_admin_chat_group()` rely directly or indirectly on the Supabase UUID identity.
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
