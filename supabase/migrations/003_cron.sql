-- Run once after setting the Vercel URL and CRON_SECRET in this query.
-- Both extensions are enabled by 20261108165316_enable_attendance_scheduler_extensions.sql.

-- Avoid duplicate jobs if this setup is repeated.
do $$
declare existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'agaby-close-sessions';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end $$;

select cron.schedule(
  'agaby-close-sessions',
  '* * * * *',
  $$
  select net.http_post(
    url := 'YOUR_APP_URL/api/cron/close',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
