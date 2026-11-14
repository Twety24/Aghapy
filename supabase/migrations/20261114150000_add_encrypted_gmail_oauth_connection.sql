create table if not exists public.gmail_oauth_tokens (
  id integer primary key check (id = 1),
  refresh_token_encrypted text not null,
  gmail_address text,
  connected_at timestamptz not null default now()
);
alter table public.gmail_oauth_tokens enable row level security;
revoke all on table public.gmail_oauth_tokens from anon, authenticated;
grant all on table public.gmail_oauth_tokens to service_role;

