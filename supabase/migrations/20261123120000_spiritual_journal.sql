create table if not exists public.spiritual_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,
  bible_reading boolean not null default false,
  attended_liturgy boolean not null default false,
  prayed boolean not null default false,
  agpeya_hours text[] not null default '{}',
  reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spiritual_journal_entries_user_date_unique unique (user_id, entry_date),
  constraint spiritual_journal_entries_agpeya_hours_check
    check (agpeya_hours <@ array['matins','third','sixth','ninth','vespers','compline','midnight_first','midnight_second','midnight_third']::text[]),
  constraint spiritual_journal_entries_reflection_length_check
    check (reflection is null or char_length(reflection) <= 500)
);
create index if not exists spiritual_journal_entries_user_date_idx on public.spiritual_journal_entries (user_id, entry_date desc);
create index if not exists spiritual_journal_entries_date_idx on public.spiritual_journal_entries (entry_date desc);
alter table public.spiritual_journal_entries enable row level security;
revoke all on public.spiritual_journal_entries from anon, authenticated;
grant select, insert, update, delete on public.spiritual_journal_entries to authenticated;
drop policy if exists "spiritual journal own read" on public.spiritual_journal_entries;
create policy "spiritual journal own read" on public.spiritual_journal_entries for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "spiritual journal own insert" on public.spiritual_journal_entries;
create policy "spiritual journal own insert" on public.spiritual_journal_entries for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "spiritual journal own update" on public.spiritual_journal_entries;
create policy "spiritual journal own update" on public.spiritual_journal_entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "spiritual journal own delete" on public.spiritual_journal_entries;
create policy "spiritual journal own delete" on public.spiritual_journal_entries for delete to authenticated using (user_id = (select auth.uid()));
comment on table public.spiritual_journal_entries is 'Private weekly spiritual journal entries. Members can manage only their own entries; admins can read for pastoral follow-up.';
