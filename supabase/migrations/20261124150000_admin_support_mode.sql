create table if not exists public.admin_support_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','active','declined','ended','expired')),
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null,
  ended_at timestamptz,
  constraint admin_support_different_users check (admin_id <> member_id)
);
create index if not exists admin_support_member_pending_idx
  on public.admin_support_sessions(member_id, requested_at desc)
  where status = 'pending';
create index if not exists admin_support_admin_active_idx
  on public.admin_support_sessions(admin_id, expires_at desc)
  where status in ('pending','active');

create table if not exists public.admin_support_audit (
  id bigint generated always as identity primary key,
  session_id uuid references public.admin_support_sessions(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_support_audit_session_idx
  on public.admin_support_audit(session_id, created_at desc);

alter table public.admin_support_sessions enable row level security;
alter table public.admin_support_audit enable row level security;
revoke all on public.admin_support_sessions from anon, authenticated;
revoke all on public.admin_support_audit from anon, authenticated;
grant all on public.admin_support_sessions to service_role;
grant all on public.admin_support_audit to service_role;
