import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSeniorAdmin } from '@/lib/guard'
import SettingsForm from '@/components/SettingsForm'
import StorageCleanupButton from '@/components/StorageCleanupButton'

export const dynamic = 'force-dynamic'

export default async function Page() {
  if (!(await getSeniorAdmin())) redirect('/admin/attendance')
  const db = await createClient()
  const [{ data: settings }, { data: admins }] = await Promise.all([
    db.from('settings').select('value').eq('key', 'admin_report_email').maybeSingle(),
    db.from('profiles').select('id, full_name').eq('role', 'admin').eq('is_active', true)
  ])
  const checks = [['مفتاح الإيميل (Resend)', !!process.env.RESEND_API_KEY], ['كلمة سر القفل التلقائي', !!process.env.CRON_SECRET]]
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">الإعدادات</h1>
      <SettingsForm initial={settings?.value || ''} />
      <StorageCleanupButton />
      <section className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
        <h2 className="font-bold">حالة الإعداد على السيرفر</h2>
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
