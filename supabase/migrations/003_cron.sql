-- بدّل YOUR_APP_URL و YOUR_CRON_SECRET بقيمك قبل ما تشغّل الملف ده (مرة واحدة)
-- مثال: https://aghapy.vercel.app  (من غير / في الآخر)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

select cron.schedule(
  'agaby-close-sessions',
  '* * * * *',   -- كل دقيقة: بيقفل الجلسات اللي وقتها خلص، ويطلع التقارير، ويبعت الإيميل ويعيد المحاولة
  $$
  select net.http_post(
    url := 'YOUR_APP_URL/api/cron/close',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
-- لإيقافه: select cron.unschedule('agaby-close-sessions');
