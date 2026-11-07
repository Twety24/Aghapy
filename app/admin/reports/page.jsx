import { createClient } from '@/lib/supabase/server'
import ResendButton from '@/components/ResendButton'

export const dynamic = 'force-dynamic'
const fmt = (d) => new Date(d).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' })
const group = (arr, k) => (arr || []).reduce((m, x) => ((m[x[k]] ||= []).push(x), m), {})

export default async function Page() {
  const db = await createClient()
  const { data: sessions } = await db.from('attendance_sessions').select('id, meeting_date, status').order('meeting_date', { ascending: false }).limit(20)
  const ids = (sessions || []).map((s) => s.id)
  const [{ data: recs }, { data: reps }, { data: logs }] = ids.length ? await Promise.all([
    db.from('attendance_records').select('session_id, full_name, status, checked_in_at').in('session_id', ids),
    db.from('reports').select('id, session_id, kind').in('session_id', ids),
    db.from('email_log').select('session_id, status, error, created_at').in('session_id', ids).order('created_at', { ascending: false })
  ]) : [{ data: [] }, { data: [] }, { data: [] }]
  const R = group(recs, 'session_id'), P = group(reps, 'session_id'), L = group(logs, 'session_id')

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">التقارير وسجل الحضور</h1>
      {(sessions || []).map((s) => {
        const rows = R[s.id] || [], files = P[s.id] || [], last = (L[s.id] || [])[0]
        const present = rows.filter((r) => r.status === 'present'), absent = rows.filter((r) => r.status === 'absent')
        const email = !last ? 'لسه ما اتبعتش' : last.status === 'sent' ? `اتبعت ${fmt(last.created_at)}` : `فشل: ${last.error || ''}`
        return (
          <article key={s.id} className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{s.meeting_date}</h2>
              <span className={`rounded-full px-3 py-0.5 text-xs text-white ${s.status === 'open' ? 'bg-green-600' : 'bg-navy'}`}>{s.status === 'open' ? 'مفتوحة' : 'مقفولة'}</span>
            </div>
            {s.status === 'closed' ? <p className="mt-1 text-sm text-navy/70">حضر {present.length} · غاب {absent.length}</p> : <p className="mt-1 text-sm text-navy/70">حضر {present.length} لحد دلوقتي</p>}
            {s.status === 'closed' && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {['present', 'absent'].map((k) => { const f = files.find((x) => x.kind === k); return f ? <a key={k} href={`/api/admin/reports/download?id=${f.id}`} className="rounded-lg bg-navy px-3 py-1.5 text-sm font-bold text-white">{k === 'present' ? 'تنزيل الحاضرين' : 'تنزيل الغايبين'}</a> : null })}
                {files.length === 2 && <ResendButton sessionId={s.id} />}
              </div>
            )}
            {s.status === 'closed' && <p className={`mt-2 text-sm ${last?.status === 'failed' ? 'text-stage' : 'text-navy/70'}`}>الإيميل: {email}</p>}
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium">الأسماء</summary>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div><p className="font-bold text-green-700">حاضرين</p>{present.map((r, i) => <p key={i}>{r.full_name}</p>)}</div>
                <div><p className="font-bold text-stage">غايبين</p>{absent.map((r, i) => <p key={i}>{r.full_name}</p>)}</div>
              </div>
            </details>
          </article>
        )
      })}
      {!sessions?.length && <p className="rounded-xl bg-white p-6 text-center text-navy/60">لسه مفيش جلسات.</p>}
    </div>
  )
}
