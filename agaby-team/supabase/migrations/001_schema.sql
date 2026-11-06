-- Agaby Team: schema + security (run once in Supabase > SQL Editor)
create extension if not exists pgcrypto;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'member' check (role in ('member','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active)
$$;

-- every new account is ALWAYS a member; the role can never come from the client
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
          new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- members can edit their name only; role / is_active / email are locked unless admin
create or replace function public.protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.id := old.id; new.role := old.role; new.is_active := old.is_active; new.email := old.email;
  end if;
  return new;
end $$;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile_columns();

alter table public.profiles enable row level security;
create policy "profiles read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles update" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- ============ settings ============
create table public.settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.settings (key, value) values ('admin_report_email', '');
alter table public.settings enable row level security;
create policy "settings admin" on public.settings for all using (public.is_admin()) with check (public.is_admin());

-- ============ attendance ============
create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  meeting_date date not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open','closed')),
  qr_secret text not null default encode(gen_random_bytes(32), 'hex'),  -- never readable by members
  created_by uuid references public.profiles(id),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.attendance_sessions enable row level security;
create policy "sessions admin" on public.attendance_sessions for all using (public.is_admin()) with check (public.is_admin());

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  status text not null check (status in ('present','absent')),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)   -- one record per member per meeting
);
alter table public.attendance_records enable row level security;
-- members can only READ their own rows; writes happen on the server with the service key
create policy "records read" on public.attendance_records for select using (user_id = auth.uid() or public.is_admin());

-- ============ suggestions ============
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  is_anonymous boolean not null default false,
  content text not null check (char_length(content) between 5 and 2000),
  created_at timestamptz not null default now()
);
alter table public.suggestions enable row level security;
create policy "suggestions insert" on public.suggestions for insert to authenticated
  with check ((is_anonymous and user_id is null) or (not is_anonymous and user_id = auth.uid()));
create policy "suggestions admin read" on public.suggestions for select using (public.is_admin());

-- ============ messages ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  sent_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.message_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz,
  unique (message_id, user_id)
);
alter table public.messages enable row level security;
alter table public.message_recipients enable row level security;
create policy "messages read" on public.messages for select using (
  public.is_admin() or exists (select 1 from public.message_recipients r where r.message_id = messages.id and r.user_id = auth.uid()));
create policy "messages admin write" on public.messages for all using (public.is_admin()) with check (public.is_admin());
create policy "recipients read" on public.message_recipients for select using (user_id = auth.uid() or public.is_admin());
create policy "recipients admin write" on public.message_recipients for all using (public.is_admin()) with check (public.is_admin());

-- members can only flip "read" on their own row, nothing else
create or replace function public.mark_message_read(p_recipient_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.message_recipients set read_at = now()
  where id = p_recipient_id and user_id = auth.uid() and read_at is null
$$;
grant execute on function public.mark_message_read(uuid) to authenticated;

-- ============ reports + email log (used by the weekly job in phase 3) ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  kind text not null check (kind in ('present','absent')),
  file_path text not null,
  created_at timestamptz not null default now()
);
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.attendance_sessions(id) on delete cascade,
  status text not null check (status in ('sent','failed','retrying')),
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
alter table public.email_log enable row level security;
create policy "reports admin" on public.reports for select using (public.is_admin());
create policy "email_log admin" on public.email_log for select using (public.is_admin());
