create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push subscriptions read own" on public.push_subscriptions;
create policy "push subscriptions read own" on public.push_subscriptions for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "push subscriptions insert own" on public.push_subscriptions;
create policy "push subscriptions insert own" on public.push_subscriptions for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "push subscriptions update own" on public.push_subscriptions;
create policy "push subscriptions update own" on public.push_subscriptions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "push subscriptions delete own" on public.push_subscriptions;
create policy "push subscriptions delete own" on public.push_subscriptions for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,update,delete on public.push_subscriptions to authenticated;

create or replace function public.get_push_runtime_config()
returns table(vapid_private_key text, webhook_secret text)
language sql security definer set search_path=''
as $$
 select
  (select decrypted_secret from vault.decrypted_secrets where name='aghapy_push_vapid_private_key' limit 1),
  (select decrypted_secret from vault.decrypted_secrets where name='aghapy_push_webhook_secret' limit 1);
$$;
revoke all on function public.get_push_runtime_config() from public,anon,authenticated;
grant execute on function public.get_push_runtime_config() to service_role;

create or replace function private.dispatch_push_notification()
returns trigger language plpgsql security definer set search_path=''
as $$
declare hook_secret text;
begin
 select decrypted_secret into hook_secret from vault.decrypted_secrets
 where name='aghapy_push_webhook_secret' limit 1;
 if hook_secret is null then return new; end if;
 perform net.http_post(
  'https://amyklgnqibkiynjthqlv.supabase.co/functions/v1/aghapy-push',
  jsonb_build_object('notification_id',new.id),
  '{}'::jsonb,
  jsonb_build_object('Content-Type','application/json','x-push-secret',hook_secret),
  5000
 );
 return new;
end;
$$;
revoke all on function private.dispatch_push_notification() from public,anon,authenticated;
drop trigger if exists dispatch_push_notification on public.notifications;
create trigger dispatch_push_notification after insert on public.notifications
for each row execute function private.dispatch_push_notification();
