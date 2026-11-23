# Migration recovery follow-up

Date: 2026-11-23
Branch: feature/clerk-auth-migration

## Fresh live migration ledger check

A fresh read-only call to the Supabase migration ledger returned **35 applied migration entries**. This supersedes the earlier audit paragraph that reported 33 entries and listed `spiritual_journal_entries` as the latest applied migration. The current final three ledger entries are:

- `20261123201843 spiritual_journal_entries`
- `20261123212835 complete_excuse_review_workflow`
- `20261123212917 clean_excuse_indexes`

The current branch migration directory still contains 24 timestamped migration files plus four legacy/manual SQL scripts. The prior slug-level reconciliation remains the working comparison: 18 ledger slugs have a same-slug repository file and 17 ledger slugs do not. Slug equality is not proof of SQL-content equality.

## Git history recovery attempt

Queried GitHub commit history for each exact expected path:

- `supabase/migrations/20261123201843_spiritual_journal_entries.sql`
- `supabase/migrations/20261123212835_complete_excuse_review_workflow.sql`
- `supabase/migrations/20261123212917_clean_excuse_indexes.sql`

GitHub returned an empty commit list for all three exact paths. Commit-message searches for the three migration slugs also returned no matching commits. Therefore these exact migration files were not recoverable from the repository's currently accessible Git history using those paths/searches. This does not rule out an external copy, another branch/repository, or a differently named historical SQL file.

## Live schema inspection boundary

A read-only catalog inspection confirmed these indexes currently exist:

- `spiritual_journal_entries_date_idx` on `spiritual_journal_entries(entry_date DESC)`
- `spiritual_journal_entries_user_date_idx` on `spiritual_journal_entries(user_id, entry_date DESC)`
- `spiritual_journal_entries_user_date_unique` unique on `spiritual_journal_entries(user_id, entry_date)`
- `spiritual_journal_entries_pkey`
- `excuses_reviewed_by_idx` on `excuses(reviewed_by)`
- `excuses_user_id_meeting_date_key` unique on `excuses(user_id, meeting_date)`
- `excuses_pkey`

These live objects describe the resulting schema, not the exact historical migration SQL, statement order, data backfills, trigger changes, grants, or policy changes. They are insufficient to recreate the missing migration files faithfully. No reconstructed migration was created.

## Decision

- Do not invent or replay replacement SQL for the missing migrations.
- Do not apply any migration to the live Supabase project.
- Before generating a replacement history, obtain the original SQL from a trusted backup/export or compare a complete schema-only dump against a known pre-migration baseline in an isolated staging database.
- The Clerk identity/RLS rewrite remains blocked until this history/schema baseline is reconciled and staging validation is available.
- No production database, `main` branch, Vercel deployment, or Clerk production setting was changed during this follow-up.
