import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/guard'
import { getWeekStart, toLocalISO, addDays } from '@/lib/spiritual-journal/constants'

export const dynamic = 'force-dynamic'
const one = value => Array.isArray(value) ? value[0] : value

export default async function SpiritualJournalAdminPage() {
  const context = await getAdminContext()
  if (!context) return null
  const db = await createClient()
  const cairoNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }))
  const weekStart = toLocalISO(getWeekStart(cairoNow))
  const weekEnd = addDays(weekStart, 6)
  const { data, error } = await db.from('spiritual_journal_entries')
    .select('user_id,entry_date,bible_reading,attended_liturgy,prayed,agpeya_hours,profiles(full_name)')
    .gte('entry_date', weekStart).lte('entry_date', weekEnd)
    .order('entry_date')
  const members = new Map()
  for (const row of data || []) {
    const member = members.get(row.user_id) || { id: row.user_id, name: one(row.profiles)?.full_name || 'عضو', days: 0, reading: 0, liturgy: 0, prayer: 0, hours: 0 }
    if (row.bible_reading || row.attended_liturgy || row.prayed || row.agpeya_hours?.length) member.days += 1
    if (row.bible_reading) member.reading += 1
    if (row.attended_liturgy) member.liturgy += 1
    if (row.prayed) member.prayer += 1
    member.hours += row.agpeya_hours?.length || 0
    members.set(row.user_id, member)
  }
  const sorted = [...members.values()].sort((a, b) => b.days - a.days || a.name.localeCompare(b.name, 'ar'))
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div><p className="text-xs font-bold tracking-widest text-[#8b77bd]">AGHAPY · CARE VIEW</p><h1 className="mt-1 text-2xl font-black">متابعة النوتة الروحية</h1><p className="mt-1 text-sm text-navy/60">الأسبوع من {weekStart} إلى {weekEnd}. عرض للمتابعة والتشجيع، مش للمقارنة أو التقييم.</p></div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">تعذر تحميل البيانات.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-navy/10"><p className="text-xs text-navy/60">أعضاء سجلوا</p><p className="mt-1 text-2xl font-black">{members.size}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-navy/10"><p className="text-xs text-navy/60">إجمالي أيام النشاط</p><p className="mt-1 text-2xl font-black">{sorted.reduce((sum, member) => sum + member.days, 0)}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-navy/10"><p className="text-xs text-navy/60">قراءة الإنجيل</p><p className="mt-1 text-2xl font-black">{sorted.reduce((sum, member) => sum + member.reading, 0)}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-navy/10"><p className="text-xs text-navy/60">ساعات الأجبية</p><p className="mt-1 text-2xl font-black">{sorted.reduce((sum, member) => sum + member.hours, 0)}</p></div>
      </div>
      <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-navy/10">
        <div className="border-b border-navy/10 p-4"><h2 className="font-bold">ملخص الأعضاء</h2><p className="text-xs text-navy/50">الأعضاء الذين سجلوا نشاطًا خلال الأسبوع الحالي.</p></div>
        <div className="divide-y divide-navy/10">
          {sorted.map(member => <div key={member.id} className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-6 sm:items-center"><div className="col-span-2 font-bold sm:col-span-2">{member.name}</div><div><p className="text-[10px] text-navy/50">أيام نشطة</p><p className="font-extrabold">{member.days}/7</p></div><div><p className="text-[10px] text-navy/50">قراءة</p><p className="font-extrabold">{member.reading}</p></div><div><p className="text-[10px] text-navy/50">قداس</p><p className="font-extrabold">{member.liturgy}</p></div><div><p className="text-[10px] text-navy/50">الأجبية</p><p className="font-extrabold">{member.hours}</p></div></div>)}
          {!sorted.length && <p className="p-8 text-center text-sm text-navy/50">لسه مفيش تسجيلات للأسبوع ده.</p>}
        </div>
      </section>
    </div>
  )
}
