import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publicKey = "BDozZL50pViHY-jyvt6KbIp7L6mSgwB-HcyIpm1M0iY2RQJL64skkyEoioOAktZj5jlMbCshhgnEeMUSZ3x2LtE";
const admin = createClient(url, service, { auth: { persistSession: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
 if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
 if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
 let body: Record<string, unknown>;
 try { body = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }

 if (body.action === "subscribe" || body.action === "unsubscribe") {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "Unauthorized" }, 401);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: "Bearer " + token } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return reply({ error: "Unauthorized" }, 401);

  if (body.action === "subscribe") {
   const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
   if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return reply({ error: "Invalid subscription" }, 400);
   const { error } = await admin.from("push_subscriptions").upsert({
    user_id: authData.user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, updated_at: new Date().toISOString()
   }, { onConflict: "endpoint" });
   if (error) return reply({ error: "Could not save subscription" }, 500);
   return reply({ ok: true });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint.startsWith("https://")) return reply({ error: "Invalid endpoint" }, 400);
  const { error } = await admin.from("push_subscriptions").delete().eq("user_id", authData.user.id).eq("endpoint", endpoint);
  if (error) return reply({ error: "Could not remove subscription" }, 500);
  return reply({ ok: true });
 }

 const notificationId = typeof body.notification_id === "string" ? body.notification_id : "";
 if (!notificationId) return reply({ error: "Invalid request" }, 400);
 const { data: rows, error: configError } = await admin.rpc("get_push_runtime_config");
 const config = Array.isArray(rows) ? rows[0] : rows;
 if (configError || !config?.webhook_secret || req.headers.get("x-push-secret") !== config.webhook_secret) return reply({ error: "Unauthorized" }, 401);
 if (!config.vapid_private_key) return reply({ error: "Push key unavailable" }, 503);

 const { data: notification } = await admin.from("notifications").select("id,user_id,title,body,href").eq("id", notificationId).maybeSingle();
 if (!notification) return reply({ error: "Notification not found" }, 404);
 const { data: preference } = await admin.from("notification_preferences").select("device_notifications_enabled").eq("user_id", notification.user_id).maybeSingle();
 if (!preference?.device_notifications_enabled) return reply({ ok: true, sent: 0 });

 const { data: subscriptions, error: subError } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", notification.user_id);
 if (subError) return reply({ error: "Could not load subscriptions" }, 500);
 if (!subscriptions?.length) return reply({ ok: true, sent: 0 });

 webpush.setVapidDetails("mailto:notifications@aghapy-team.app", publicKey, config.vapid_private_key);
 const payload = JSON.stringify({ title: notification.title || "Aghapy Team", body: notification.body || "لديك إشعار جديد", url: notification.href || "/dashboard" });
 const results = await Promise.allSettled(subscriptions.map(async (sub) => {
  try {
   await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
   return true;
  } catch (error) {
   const status = (error as { statusCode?: number }).statusCode;
   if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
   else console.error("Push delivery failed", status || "unknown");
   return false;
  }
 }));
 const sent = results.filter(x => x.status === "fulfilled" && x.value).length;
 return reply({ ok: true, sent });
});
