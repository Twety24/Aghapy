-- Required by the Supabase cron job that closes attendance sessions automatically.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;