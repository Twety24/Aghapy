import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/lang'

export const dynamic = 'force-dynamic'
const fmt = (d) => new Date(d).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' })
const one = (x) => (Array.isArray(x) ? x[0] : x)

function Stat({ label, value }) {
  return <div className="rounded-2xl bg-white p-5 ring-1 ring-navy/10"><p className="text-sm text-navy/60">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>
}

export default async function Overview() {
  const en = (await getLang()) === 'en'
  const db = await createClient()
  const [{ count: total }, { count: journalCount }, { data: latest }, { data: recent }, { data: recentJournal }] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
    db.from('spiritual_journal_entries').select('id', { count: 'exact', head: true }),
    db.from('attendance_sessions').select('id, meeting_date, status').order('meeting_date', { ascending: false }).limit(1),
    db.from('attendance_records').select('full_name, checked_in_at').eq('status', 'present').order('checked_in_at', { ascending: false }).limit(5),
    db.from('spiritual_journal_entries').select('entry_date,bible_reading,attended_liturgy,prayed,profiles(full_name)').order('entry_date', { ascending: false }).limit(3)
  ])
  const s = latest?.[0]
  let present = 0
  if (s) present = (await db.from('attendance_records').select('id', { count: 'exact', head: true }).eq('session_id', s.id).eq('status', 'present')).count || 0
  const absent = s ? Math.max((total || 0) - present, 0) : 0
  const pct = s && total ? Math.round((present / total) * 100) : 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">{en ? 'Overview' : 'نظرة عامة'}</h1>
      <p className="text-sm text-navy/60">{s ? `${en ? 'Last session' : 'آخر اجتماع'}: ${s.meeting_date} (${s.status === 'open' ? (en ? 'Open' : 'مفتوح') : (en ? 'Closed' : 'مقفول')})` : (en ? 'No sessions yet.' : 'مفيش اجتماعات لسه.')}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label={en ? 'Registered members' : 'الأعضاء المسجّلين'} value={total ?? 0} />
        <Stat label={en ? 'Present' : 'حضروا'} value={present} />
        <Stat label={en ? 'Absent' : 'غابوا'} value={absent} />
        <Stat label={en ? 'Attendance rate' : 'نسبة الحضور'} value={`${pct}%`} />
        <Stat label={en ? 'Journal entries' : 'تسجيلات النوتة الروحية'} value={journalCount ?? 0} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
          <h2 className="font-bold">{en ? 'Recent attendance' : 'آخر تسجيلات الحضور'}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(recent || []).map((r, i) => <li key={i} className="flex justify-between"><span>{r.full_name}</span><span className="text-navy/60">{fmt(r.checked_in_at)}</span></li>)}
            {!recent?.length && <li className="text-navy/60">{en ? 'Nothing yet.' : 'لسه مفيش.'}</li>}
          </ul>
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
          <h2 className="font-bold">{en ? 'Recent journal activity' : 'آخر نشاط في النوتة الروحية'}</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {(recentJournal || []).map((r, i) => <li key={i}><p className="line-clamp-2">{r.entry_date} · {[r.bible_reading && (en ? 'Bible reading' : 'قراءة الإنجيل'), r.attended_liturgy && (en ? 'Liturgy' : 'القداس'), r.prayed && (en ? 'Prayer' : 'الصلاة')].filter(Boolean).join(' · ') || (en ? 'Journal opened' : 'فتح النوتة')}</p><p className="text-navy/60">{one(r.profiles)?.full_name || '—'}</p></li>)}
            {!recentJournal?.length && <li className="text-navy/60">{en ? 'Nothing yet.' : 'لسه مفيش.'}</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
