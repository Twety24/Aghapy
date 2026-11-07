import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
const fmt = (d) => new Date(d).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' })
const one = (x) => (Array.isArray(x) ? x[0] : x)

function Stat({ label, value }) {
  return <div className="rounded-2xl bg-white p-5 ring-1 ring-navy/10"><p className="text-sm text-navy/60">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>
}

export default async function Overview() {
  const db = await createClient()
  const [{ count: total }, { count: sugg }, { data: latest }, { data: recent }, { data: recentSugg }] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
    db.from('suggestions').select('id', { count: 'exact', head: true }),
    db.from('attendance_sessions').select('id, meeting_date, status').order('meeting_date', { ascending: false }).limit(1),
    db.from('attendance_records').select('full_name, checked_in_at').eq('status', 'present').order('checked_in_at', { ascending: false }).limit(5),
    db.from('suggestions').select('content, created_at, is_anonymous, profiles(full_name)').order('created_at', { ascending: false }).limit(3)
  ])
  const s = latest?.[0]
  let present = 0
  if (s) present = (await db.from('attendance_records').select('id', { count: 'exact', head: true }).eq('session_id', s.id).eq('status', 'present')).count || 0
  const absent = s ? Math.max((total || 0) - present, 0) : 0
  const pct = s && total ? Math.round((present / total) * 100) : 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">نظرة عامة</h1>
      <p className="text-sm text-navy/60">{s ? `آخر اجتماع: ${s.meeting_date} (${s.status === 'open' ? 'مفتوح' : 'مقفول'})` : 'مفيش اجتماعات لسه.'}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="الأعضاء المسجّلين" value={total ?? 0} />
        <Stat label="حضروا" value={present} />
        <Stat label="غابوا" value={absent} />
        <Stat label="نسبة الحضور" value={`${pct}%`} />
        <Stat label="المقترحات" value={sugg ?? 0} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
          <h2 className="font-bold">آخر تسجيلات الحضور</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(recent || []).map((r, i) => <li key={i} className="flex justify-between"><span>{r.full_name}</span><span className="text-navy/60">{fmt(r.checked_in_at)}</span></li>)}
            {!recent?.length && <li className="text-navy/60">لسه مفيش.</li>}
          </ul>
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
          <h2 className="font-bold">آخر المقترحات</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {(recentSugg || []).map((r, i) => <li key={i}><p className="line-clamp-2">{r.content}</p><p className="text-navy/60">{r.is_anonymous ? 'مجهول' : one(r.profiles)?.full_name} · {fmt(r.created_at)}</p></li>)}
            {!recentSugg?.length && <li className="text-navy/60">لسه مفيش.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
