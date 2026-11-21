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
    <h1 className="text-2xl font-bold"{en?'Reports and attendance history':'التقارير وسجل الحضور'}</h1>
    {(sessions || []).map(session => {
      const rows = bySession[session.id] || []
      const files = filesBySession[session.id] || []
      const last = (logsBySession[session.id] || [])[0]
      const present = rows.filter(row => row.status === 'present')
      const absent = rows.filter(row => row.status === 'absent')
      const emailStatus = !last ? (en?'Not sent yet':'لسه ما اتبعتش') : last.status === 'sent' ? `${en?'Sent':'اتبعت'} ${fmt(last.created_at)}` : `${en?'Failed':'فشل'}: ${last.error || ''}`
      return <article key={session.id} className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{session.title}</h2>
            <p className="mt-1 text-sm text-navy/65">{session.location} · {fmt(session.starts_at)} إلى {fmt(session.ends_at)}</p>
            <p className="text-xs text-navy/50">{en?'Created by:':'أنشأها:'} {session.created_by_profile?.full_name || (en?'Administrator':'أدمن')} · {session.meeting_date}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs text-white ${session.status === 'open' ? 'bg-green-600' : 'bg-navy'}`}>{session.status === 'open' ? 'مفتوحة' : 'مقفولة'}</span>
        </div>
        <p className="mt-3 text-sm text-navy/70">{en?'Present':'حضر'} {present.length} · {en?'Absent':'غاب'} {absent.length}</p>
        {session.status === 'closed' && <div className="mt-3 flex flex-wrap items-center gap-2">
          {['present','absent'].map(kind => {
            const file = files.find(item => item.kind === kind)
            return file ? <a key={kind} href={`/api/admin/reports/download?id=${file.id}`} className="rounded-lg bg-navy px-3 py-2 text-sm font-bold text-white">{kind === 'present' ? en?'Download present':'Download absent'}</a> : null
          })}
          {files.length === 2 && <ResendButton sessionId={session.id} />}
        </div>}
        {session.status === 'closed' && <p className={`mt-2 text-sm ${last?.status === 'failed' ? 'text-stage' : 'text-navy/70'}`}>{en?'Email:':'الإيميل:'} {emailStatus}</p>}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium"{en?'Names':'الأسماء'}</summary>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div><p className="font-bold text-green-700"{en?'Present':'حاضرين'}</p>{present.map((row, index) => <p key={index}>{row.full_name}</p>)}</div>
            <div><p className="font-bold text-stage"{en?'Absent':'غايبين'}</p>{absent.map((row, index) => <p key={index}>{row.full_name}</p>)}</div>
          </div>
        </details>
      </article>
    })}
    {!sessions?.length && <p className="rounded-xl bg-white p-6 text-center text-navy/60">{en?'No sessions yet.':'لسه مفيش جلسات.'}</p>}
  </div>
}
