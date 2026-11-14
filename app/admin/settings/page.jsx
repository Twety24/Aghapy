import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSeniorAdmin } from '@/lib/guard'
import { getGmailConnection } from '@/lib/gmail'
import SettingsForm from '@/components/SettingsForm'
import GmailConnectButton from '@/components/GmailConnectButton'
import StorageCleanupButton from '@/components/StorageCleanupButton'

export const dynamic = 'force-dynamic'

export default async function Page({searchParams}) {
  if (!(await getSeniorAdmin())) redirect('/admin/attendance')
  const params=await searchParams
  const db = await createClient()
  const [{ data: settings }, { data: admins }, gmail] = await Promise.all([
    db.from('settings').select('value').eq('key', 'admin_report_email').maybeSingle(),
    db.from('profiles').select('id, full_name').eq('role', 'admin').eq('is_active', true),
    getGmailConnection().catch(()=>null)
  ])
  const checks = [
    ['Google OAuth Client ID',!!process.env.GOOGLE_CLIENT_ID],
    ['Google OAuth Client Secret',!!process.env.GOOGLE_CLIENT_SECRET],
    ['مفتاح تشفير توكن Gmail',!!process.env.GMAIL_TOKEN_ENCRYPTION_KEY],
    ['حساب Gmail متصل',!!gmail],
    ['بريد استقبال التقارير',!!settings?.value?.trim()],
    ['كلمة سر القفل التلقائي',!!process.env.CRON_SECRET]
  ]
  const messages={
    connected:'تم ربط Gmail بنجاح.',
    disconnected:'تم فصل حساب Gmail.',
    'missing-config':'إعدادات Google OAuth أو مفتاح التشفير غير مكتملة على السيرفر.',
    'token-error':'Google لم يرجع Refresh Token. افصل وصول Aghapy من إعدادات حساب Google ثم أعد الربط.',
    'state-error':'انتهت صلاحية محاولة الربط أو فشل التحقق الأمني. ابدأ الربط من جديد.',
    'login-required':'سجّل الدخول كأدمن ثم أعد محاولة الربط.',
    cancelled:'تم إلغاء ربط Gmail.',
    'save-error':'تعذر حفظ اتصال Gmail. راجع إعدادات قاعدة البيانات.',
    'disconnect-error':'تعذر فصل Gmail.'
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">الإعدادات</h1>
      <SettingsForm initial={settings?.value || ''} />
      <GmailConnectButton connected={!!gmail} email={gmail?.gmail_address}/>
      {params?.gmail&&messages[params.gmail]&&<p className={params.gmail==='connected'?'alert-ok':'alert-error'} role="status">{messages[params.gmail]}</p>}
      <StorageCleanupButton />
      <section className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
        <h2 className="font-bold">حالة إعداد إرسال التقارير</h2>
        <ul className="mt-2 space-y-1 text-sm">{checks.map(([label, ok]) => <li key={label}>{ok ? '✓' : '×'} {label}</li>)}</ul>
      </section>
      <section className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
        <h2 className="font-bold">الأدمنز ({admins?.length || 0})</h2>
        <ul className="mt-2 space-y-1 text-sm">{(admins || []).map(admin => <li key={admin.id}>{admin.full_name}</li>)}</ul>
        <Link href="/admin/members" className="mt-3 inline-block text-sm font-bold underline">إضافة أو إزالة أدمن من صفحة الأعضاء</Link>
      </section>
    </div>
  )
}
