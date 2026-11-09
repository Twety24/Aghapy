create table if not exists public.notification_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 device_notifications_enabled boolean not null default false,
 choice_made_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
drop policy if exists "notification preferences own select" on public.notification_preferences;
create policy "notification preferences own select" on public.notification_preferences for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "notification preferences own insert" on public.notification_preferences;
create policy "notification preferences own insert" on public.notification_preferences for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "notification preferences own update" on public.notification_preferences;
create policy "notification preferences own update" on public.notification_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update on public.notification_preferences to authenticated;