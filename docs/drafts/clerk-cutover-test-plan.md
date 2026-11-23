# Clerk Authentication Migration: Cutover and Security Test Plan

Status: planning document only. No production settings, database objects, or runtime code are changed by this document.

## 1. Non-negotiable invariants

- Preserve every existing `public.profiles.id` UUID and every historical foreign-key relationship.
- Preserve all 48 existing Supabase Auth rows during the initial Clerk rollout. Do not bulk-delete or recreate legacy users.
- Resolve the one existing Auth user without a profile before enabling account linking. Never guess which profile belongs to that account.
- Preserve exactly one protected Super Admin. No regular Admin may create, promote, demote, deactivate, or delete the Super Admin.
- Keep all application RLS enabled. Do not solve migration problems by disabling RLS or using the service-role key for ordinary user operations.
- Do not trust browser-supplied Clerk subject IDs, profile UUIDs, roles, or active-state flags.
- Keep the current public-read and bucket-specific Storage behavior unless a separate requirement justifies changing it.
- Do not deploy, apply SQL to production, or modify Clerk/Vercel production settings without explicit approval.

## 2. Migration stages

### Stage A: identity bridge, no cutover
1. Configure and verify Clerk's native Supabase third-party-auth integration in a non-production/test environment.
2. Add a private mapping table from Clerk user ID (text) to existing profile UUID (uuid), with unique constraints on both columns.
3. Add a `private.current_profile_id()` helper that reads only the verified JWT subject and resolves it through the private mapping table.
4. Keep mapping-table writes unavailable to browser roles. Only a verified server-side linking/webhook workflow may write mappings.
5. Verify the helper returns NULL for anonymous, unknown, malformed, and unmapped subjects.

### Stage B: existing-account linking
1. Match only exact normalized email addresses that are unique on both sides.
2. Require Clerk email verification and the existing Supabase email confirmation state.
3. Link Clerk ID to the existing profile UUID; do not copy a client-supplied UUID.
4. Produce an explicit exception report for unmatched, duplicate, or unverified identities.
5. Resolve the legacy Auth account without a profile manually before enabling the general linking path.
6. Verify that a user who signs in with a different email cannot claim another member's profile.

### Stage C: database identity migration
1. Replace direct member ownership comparisons against `auth.uid()` with `private.current_profile_id()` only where the comparison represents the current caller.
2. Update private admin/group helper functions while preserving their original predicates.
3. Update security-definer RPCs and profile triggers to derive the actor from the verified Clerk subject mapping.
4. Update Storage folder ownership checks to compare the first folder segment against the mapped profile UUID.
5. Keep target-row identifiers (for example `new.id`, `old.id`, group member `user_id`) as profile UUIDs; do not confuse target IDs with caller identity.
6. Deliberately address the `profiles.id -> auth.users.id` FK and legacy `on_auth_user_created` trigger in a separate reviewed migration. Do not remove the FK until a safe new-user creation flow is ready.
7. Preserve Super Admin and last-active-admin invariants, including service-role-trigger behavior.

### Stage D: application authentication
1. Add the Clerk Next.js SDK and update the lockfile together.
2. Replace the request proxy, server guards, login, registration, sign-out, password recovery, and callback flows.
3. Keep Supabase browser/server clients using Clerk's supported third-party-auth token integration; never put a Supabase service-role secret in browser code.
4. Update every API route that currently relies on Supabase Auth user state. For service-role routes, authenticate Clerk on the server and authorize against the mapped profile before any privileged query.
5. New accounts must be created as regular members only. Roles and Super Admin flags are assigned only by protected server/database logic.
6. Keep Google sign-in separate from the base email/password migration until production OAuth credentials are configured by the project owner.

### Stage E: controlled rollout and rollback
1. Run automated and manual tests in preview/staging with a non-production Clerk instance and database.
2. Use a small allowlist for existing test accounts first.
3. Verify logs and error rates before expanding.
4. Keep the previous production login path available until the Clerk path has passed acceptance tests and a rollback window has been agreed.
5. Only after explicit approval, schedule production database migration, environment configuration, and deployment as separate steps.

## 3. Required security tests

### Identity and mapping
- Verified known Clerk subject resolves to exactly one expected profile UUID.
- Unmapped Clerk subject resolves to NULL and receives no profile-owned data.
- Anonymous request resolves to NULL.
- Browser attempts to write or alter the mapping table are denied.
- Duplicate Clerk subject and duplicate profile UUID mappings are rejected.
- Email case/whitespace normalization does not create ambiguous matches; duplicate normalized emails are rejected for manual review.
- An unverified Clerk email cannot link to a confirmed legacy profile.
- A changed email on an existing Clerk account does not silently relink it to another profile.

### RLS and data isolation
- Member A cannot read or update Member B's profile, excuses, notifications, preferences, journal entries, attendance records, or private photos.
- Member A cannot create a group message with Member B's sender UUID.
- Member A cannot mark Member B's message recipient row as read.
- Group membership grants access only to the corresponding group.
- Admin-only pages and data remain unavailable to regular members.
- Existing public album, meeting content, and team-file read behavior remains unchanged.
- RLS remains enabled on every application table.

### Storage
- A member can upload/delete only their own avatar path.
- A member cannot upload to another member's UUID folder.
- A member can upload gallery content only under their own permitted folder path.
- A member cannot delete gallery content unless the existing admin policy allows it.
- Meeting storage remains admin-only for insert/delete.
- Existing read access for the configured team buckets remains unchanged.

### Admin and Super Admin
- Regular Admin can perform the currently permitted admin operations.
- Regular Admin can add/remove/promote/demote other regular Admins only where the current app permits it.
- No regular Admin can modify, deactivate, demote, or delete the Super Admin.
- No user can create a second Super Admin through signup metadata, API payload, RPC, or direct profile update.
- Super Admin protection remains effective for service-role updates.
- The last active Admin cannot be removed or deactivated if that would leave no active Admin.
- Admin-chat membership continues to follow active Admin status.
- A user cannot change their own role or active status through profile updates.

### API and application
- Every protected route rejects missing/invalid Clerk sessions.
- Every service-role route performs server-side Clerk authentication and role authorization before privileged operations.
- Attendance QR check-in maps the authenticated Clerk subject to the same legacy profile UUID used by historical attendance rows.
- CSV/XLSX exports preserve current access restrictions.
- Gmail OAuth connect/callback/disconnect routes cannot be invoked by non-admin users.
- Cron routes continue to require their separate cron secret and do not accept a user session as a substitute.
- Login, registration, logout, email verification, forgot password, and reset password work without Supabase Auth sessions after cutover.
- A newly registered user receives member role and an assigned profile UUID; no admin metadata is honored.

## 4. Acceptance criteria

- Zero changed legacy profile UUIDs.
- Zero lost profile or related records.
- Zero unexpected role or active-state changes.
- All existing mapped accounts resolve to the correct profile.
- No cross-user data access in the negative RLS tests.
- No mapping table access from anon/authenticated browser roles.
- No production migration or deployment until all tests pass and the owner explicitly approves.

## 5. Known blockers / owner actions

- The owner must resolve the single legacy Supabase Auth user with no matching profile before general linking is enabled.
- The owner must configure Clerk's production email/password strategy and Google OAuth credentials when the migration reaches production configuration.
- The owner must provide explicit approval before any production database DDL, Clerk production setting change, Vercel environment change, or deployment.
- Never request the Clerk Secret Key in chat. Configure secrets directly in the deployment provider's secure environment-variable interface.


## 6. Branch-pinned application impact inventory

### Routes that currently consume Supabase Auth identity

- `app/api/attendance/checkin/route.js`: reads the Supabase user UUID and uses it as `profiles.id` and `attendance_records.user_id`. After Clerk, this must resolve the Clerk subject to the legacy profile UUID before reading profile status or inserting attendance.
- `app/api/suggestions/route.js`: uses the Supabase user UUID as `suggestions.user_id`. Anonymous suggestions still need a trusted authenticated actor for submission, even when the stored author is hidden.
- `app/api/suggestions/admins/route.js`: requires a signed-in user before returning active Admin recipients.
- `app/api/admin/members/route.js`: returns the actor's ID to the browser and compares target IDs with that actor ID. The response must expose the mapped profile UUID for UI comparisons, never use the Clerk subject as a profile UUID.
- `app/api/admin/session/route.js`: writes `attendance_sessions.created_by` as the actor's profile UUID.
- `app/api/admin/gmail/connect` and callback: the OAuth state is bound to the authenticated actor. Keep the state tied to a stable server-verified actor identity; do not accept an actor ID from the callback query.
- `app/api/admin/reports/*`, `app/api/admin/token`, `app/api/admin/session/close`, `app/api/admin/gmail/disconnect`, and `app/api/admin/storage-cleanup`: currently depend on `getAdmin()` / `getSeniorAdmin()`; those guards must become Clerk-aware and preserve current Admin authorization.
- `app/api/cron/close`: uses its separate constant-time CRON_SECRET check, not a Supabase user session. Preserve that independent machine-auth path.

### Server-rendered pages and client components with profile UUID assumptions

- `app/profile/page.jsx` loads the profile by `user.id`.
- `app/photos/page.jsx` loads the current profile role by `user.id` and passes `user.id` as Gallery's `userId`; Gallery uses it for Storage folder names and `photos.uploaded_by`.
- `app/messages/page.jsx` filters `message_recipients.user_id` by `user.id`.
- `app/chats/[id]/page.jsx`, `app/chats/page.jsx`, and `components/GroupChat.jsx` rely on the Supabase Auth session; GroupChat currently submits `sender_id` from the client session. Under Clerk, the RPC/policy must derive the sender from the verified JWT mapping, not trust a submitted sender ID.
- `app/excuse/page.jsx` writes `excuses.user_id` from the client session; this must use a trusted profile UUID or be moved behind a server endpoint.
- `app/dashboard/page.jsx` uses the Auth UUID for profiles, notifications, notification preferences, and client notification components; all these values must use the mapped profile UUID. Its server action currently signs out of Supabase Auth and must be replaced with Clerk sign-out.
- `components/MembersManager.jsx` compares a profile UUID returned by the admin API with the actor ID. Keep this as a profile UUID comparison after migration.
- `components/ProfileForm.jsx` already receives a profile object with a stable profile UUID; preserve that contract.

### Registration and profile creation compatibility boundary

The existing signup trigger `public.handle_new_user()` inserts `profiles.id = auth.users.id`. Clerk-created users will not have a corresponding Supabase Auth user, so this trigger cannot create their profile. A future atomic, trusted Clerk webhook/server workflow must create a new UUID profile and its mapping row together. Before that workflow is enabled, the FK `profiles.id -> auth.users.id` and the existing trigger must be changed deliberately. Existing legacy Auth users and their profile UUIDs must remain untouched.

### Security-sensitive observation

Several existing service-role API routes trust `getAdminContext()` before reading or writing unrestricted tables. The migration must replace that guard with a Clerk server-session verification plus a server-side lookup of the mapped profile and active Admin role. The service-role client must remain server-only and must never become the default data client for ordinary profile-owned operations.
