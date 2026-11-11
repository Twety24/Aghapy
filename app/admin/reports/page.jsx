import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSeniorAdmin } from '@/lib/guard'
import ResendButton from '@/components/ResendButton'
export const dynamic = 'force-dynamic'
const fmt = d => new Date(d).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' })
const group = (arr, key) => (arr || []).reduce((map, item) => ((map[item[key]] ||=[]).push(item), map), {})
export default async function Page() {
  if (!(await getSeniorAdmin())) redirect('/admin/attendance')
  const db = await createClient()
  const { data: sessions } = await db.from('attendance_sessions').select('id,title,location,meeting_date,starts_at,ends_at,status,created_by,created_by_profile:profiles!attendance_sessions_created_by_fkey(full_name)').order('starts_at', { ascending: false }).limit(50)
  const ids = (sessions || []).map(session => session.id)
  const [{ data: records }, { data: reports }, { data: logs }] = ids.length ? await Promise.all([
    db.from('attendance_records').select('session_id,full_name,status,checked_in_at').in('session_id', ids),
    db.from('reports').select('id,session_id,kind').in('session_id', ids),
    db.from('email_log').select('session_id,status,error,created_at').in('session_id', ids).order('created_at', { ascending: false })
  ]) : [{ data: [] }, { data: [] }, { data: [] }]
  const bySession = group(records, 'session_id')
  const filesBySession = group(reports, 'session_id')
  const logsBySession = group(logs, 'session_id')
  return <div className="mx-auto max-w-4xl space-y-4">
    <h1 className="text-2xl font-bold">التقارير وسجل الحضور</h1>
    {(sessions || []).map(session => {
      const rows = bySession[session.id] || []
      const files = filesBySession[session.id] || []
      const last = (logsBySession[session.id] || [])[0]
      const present = rows.filter(row => row.status === 'present')
      const absent = rows.filter(row => row.status === 'absent')
      const emailStatus = !last ? 'لسه ما اتبعتش' : last.status === 'sent' ? `اتبعت ${fmt(last.created_at)}` : `فشل: ${last.error || ''}`
      return <article key={session.id} className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{session.title}</h2>
            <p className="mt-1 text-sm text-navy/65">{session.location} · {fmt(session.starts_at)} إلى {fmt(session.ends_at)}</p>
            <p className="text-xs text-navy/50">أنشأها: {session.created_by_profile?.full_name || 'أدمن'} · {session.meeting_date}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs text-white ${session.status === 'open' ? 'bg-green-600' : 'bg-navy'}`}>{session.status === 'open' ? 'مفتوحة' : 'مقفولة'}</span>
        </div>
        <p className="mt-3 text-sm text-navy/70">حضر {present.length} · غاب {absent.length}</p>
        {session.status === 'closed' && <div className="mt-3 flex flex-wrap items-center gap-2">
          {['present','absent'].map(kind => {
            const file = files.find(item => item.kind === kind)
            return file ? <a key={kind} href={`/api/admin/reports/download?id=${file.id}`} className="rounded-lg bg-navy px-3 py-2 text-sm font-bold text-white">{kind === 'present' ? 'تنزيل الحاضرين' : 'تنزيل الغايبين'}</a> : null
          })}
          {files.length === 2 && <ResendButton sessionId={session.id} />}
        </div>}
        {session.status === 'closed' && <p className={`mt-2 text-sm ${last?.status === 'failed' ? 'text-stage' : 'text-navy/70'}`}>الإيميل: {emailStatus}</p>}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium">الأسماء</summary>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div><p className="font-bold text-green-700">حاضرين</p>{present.map((row, index) => <p key={index}>{row.full_name}</p>)}</div>
            <div><p className="font-bold text-stage">غايبين</p>{absent.map((row, index) => <p key={index}>{row.full_name}</p>)}</div>
          </div>
        </details>
      </article>
    })}
    {!sessions?.length && <p className="rounded-xl bg-white p-6 text-center text-navy/60">لسه مفيش جلسات.</p>}
  </div>
}
