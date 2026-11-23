'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AGPEYA_HOURS, EMPTY_ENTRY, JOURNAL_DAYS, addDays, getWeekStart, toLocalISO } from '@/lib/spiritual-journal/constants'
import { buildWeeklyAutomation } from '@/lib/spiritual-journal/automation'
import { useT } from '@/components/LangProvider'

const activities = [
  { key: 'bible_reading', label: 'قراءة الكتاب المقدس', labelEn: 'Bible reading', icon: '✦', color: 'bg-[#e9f1ff] text-[#31558e]' },
  { key: 'attended_liturgy', label: 'حضور القداس', labelEn: 'Attend liturgy', icon: '⌂', color: 'bg-[#f7eee3] text-[#8c5d2e]' },
  { key: 'prayed', label: 'الصلاة', labelEn: 'Prayer', icon: '☼', color: 'bg-[#f1eafa] text-[#74539a]' }
]

export default function SpiritualJournalPage() {
  const { lang } = useT()
  const en = lang === 'en'
  const [weekStart, setWeekStart] = useState(() => toLocalISO(getWeekStart()))
  const [entries, setEntries] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  const weekDates = useMemo(() => JOURNAL_DAYS.map(day => addDays(weekStart, day.offset)), [weekStart])
  const today = toLocalISO(new Date())
  const isCurrentWeek = weekStart === toLocalISO(getWeekStart())
  const automation = useMemo(() => buildWeeklyAutomation(Object.values(entries)), [entries])

  const loadWeek = useCallback(async () => {
    setLoading(true)
    setError('')
    const response = await fetch('/api/spiritual-journal?weekStart=' + weekStart, { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setError(result.message || '{en ? 'Could not load the journal.' : 'تعذر تحميل النوتة.'}')
    else {
      const mapped = {}
      for (const entry of result.entries || []) mapped[entry.entry_date] = { ...EMPTY_ENTRY, ...entry }
      setEntries(mapped)
    }
    setLoading(false)
  }, [weekStart])

  useEffect(() => { loadWeek() }, [loadWeek])

  async function updateDay(date, patch) {
    const current = { ...EMPTY_ENTRY, ...(entries[date] || {}) }
    const next = { ...current, ...patch }
    if (patch.agpeya_hours) next.prayed = true
    setEntries(value => ({ ...value, [date]: next }))
    setSaving(date)
    setSaved('')
    setError('')
    const response = await fetch('/api/spiritual-journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryDate: date, ...next })
    })
    const result = await response.json().catch(() => ({}))
    setSaving('')
    if (!response.ok) {
      setError(result.message || '{en ? 'Could not save this change.' : 'ماقدرناش نحفظ التغيير.'}')
      await loadWeek()
      return
    }
    setEntries(value => ({ ...value, [date]: { ...EMPTY_ENTRY, ...result.entry } }))
    setSaved(date)
    window.setTimeout(() => setSaved(currentDate => currentDate === date ? '' : currentDate), 1800)
  }

  function toggleHour(date, hour) {
    const current = entries[date]?.agpeya_hours || []
    const next = current.includes(hour) ? current.filter(item => item !== hour) : [...current, hour]
    updateDay(date, { agpeya_hours: next })
  }

  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-[#f7f8fc] px-4 pb-12 pt-5 text-[#1d2b49]">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#61708d] hover:text-[#1d2b49]">← {en ? 'Back' : 'رجوع'}</Link>
      <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#142b5a] via-[#263f78] to-[#705b91] p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -left-10 -top-12 h-44 w-44 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-8 h-48 w-48 rounded-full border-[24px] border-white/5" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-white/65">AGHAPY · YOUR WEEKLY WALK</p>
            <h1 className="mt-2 text-3xl font-black">{en ? 'Spiritual Journal' : 'النوتة الروحية'}</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/80">{en ? 'A small space to keep track of your spiritual rhythm, one day at a time.' : 'مساحتك الصغيرة تتابع فيها علاقتك بربنا، يوم بيوم ومن غير ضغط.'}</p>
          </div>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-3xl">✧</div>
        </div>
        <div className="relative mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-white/65">{en ? 'Your week so far' : 'رحلتك الأسبوع ده'}</p>
            <p className="mt-1 text-3xl font-black">{automation.activeDays}<span className="ms-1 text-sm font-medium text-white/70">{en ? '/ 7 days' : '/ 7 أيام'}</span></p>
          </div>
          <div className="w-36">
            <div className="mb-2 flex justify-between text-[11px] text-white/70"><span>{en ? 'Weekly progress' : 'تقدم الأسبوع'}</span><span>{automation.completion}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#d9c4ff] transition-all" style={{ width: automation.completion + '%' }} /></div>
          </div>
        </div>
      </section>

      <section className="mt-5 flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#e6eaf2]">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-[#f0f3fa]">← {en ? 'Previous week' : 'الأسبوع السابق'}</button>
        <div className="text-center"><p className="text-xs text-[#8994a9]">{en ? 'Your week' : 'أسبوعك'}</p><p className="text-sm font-extrabold">{weekDates[0]} <span className="text-[#9aa4b7]">{en ? 'to' : 'إلى'}</span> {weekDates[6]}</p></div>
        <button disabled={isCurrentWeek} onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-[#f0f3fa] disabled:opacity-30">{en ? 'Next week' : 'الأسبوع التالي'} →</button>
      </section>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <div className="mt-5 rounded-2xl bg-white p-8 text-center text-sm text-[#8994a9]">{en ? 'Getting your journal ready...' : 'بنجهّز نوتتك...'}</div> : (
        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          {JOURNAL_DAYS.map((day, index) => {
            const date = weekDates[index]
            const entry = { ...EMPTY_ENTRY, ...(entries[date] || {}) }
            const isToday = date === today
            const isFuture = date > today
            const hasActivity = entry.bible_reading || entry.attended_liturgy || entry.prayed || entry.agpeya_hours.length
            return (
              <article key={date} className={`rounded-[1.6rem] border p-4 shadow-sm transition ${isToday ? 'border-[#8b77bd] bg-[#fbf9ff] ring-2 ring-[#e9e2f6]' : 'border-[#e8ecf3] bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-11 w-11 place-items-center rounded-2xl text-lg font-black ${hasActivity ? 'bg-[#e8e0f5] text-[#6b5293]' : 'bg-[#f0f3f8] text-[#68758d]'}`}>{day.short}</span>
                    <div><h2 className="font-extrabold">{en ? day.labelEn : day.label}</h2><p className="text-xs text-[#8994a9]">{date}</p></div>
                  </div>
                  {isToday && <span className="rounded-full bg-[#eee8fa] px-3 py-1 text-[10px] font-bold text-[#6b5293]">{en ? 'Today' : 'النهارده'}</span>}
                </div>
                <div className="mt-4 space-y-2">
                  {activities.map(activity => (
                    <button key={activity.key} disabled={saving === date || isFuture} onClick={() => updateDay(date, { [activity.key]: !entry[activity.key] })} className={`flex w-full items-center gap-3 rounded-xl p-3 text-start transition active:scale-[.99] disabled:opacity-50 ${entry[activity.key] ? activity.color : 'bg-[#f7f8fb] text-[#77839a] hover:bg-[#f0f2f7]'}`}>
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/80 text-lg">{activity.icon}</span>
                      <span className="flex-1 text-sm font-bold">{en ? activity.labelEn : activity.label}</span>
                      <span className="text-lg">{entry[activity.key] ? '✓' : '+'}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-[#f7f5fb] p-3">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-extrabold text-[#51406e]">{en ? 'Agpeya hours' : 'ساعات الأجبية'}</p><span className="text-[10px] text-[#9185a5]">{en ? 'Select the hours you prayed' : 'اختار اللي صليته'}</span></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {AGPEYA_HOURS.map(hour => {
                      const active = entry.agpeya_hours.includes(hour.id)
                      return <button key={hour.id} disabled={saving === date || isFuture} onClick={() => toggleHour(date, hour.id)} title={hour.sub} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${active ? 'border-[#705b91] bg-[#705b91] text-white' : 'border-[#e4dced] bg-white text-[#6e6080] hover:border-[#9a84bb]'} disabled:opacity-50`}>{en ? hour.labelEn : hour.label}</button>
                    })}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-[#9aa4b7]">
                  <span>{isFuture ? '{en ? 'Not yet' : 'اليوم لسه مجاش'}' : hasActivity ? '{en ? 'Nice step recorded' : 'خطوة حلوة اتسجلت'}' : '{en ? 'Ready when you are' : 'لسه مستني خطوتك'}'}</span>
                  <span>{saving === date ? '{en ? 'Saving...' : 'بيحفظ...'}' : saved === date ? '{en ? 'Saved ✓' : 'اتحفظت ✓'}' : '{en ? 'Auto-saved' : 'حفظ تلقائي'}'}</span>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {!loading && (
        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [en ? 'Bible reading' : 'قراءة الإنجيل', automation.totals.reading, en ? 'days' : 'أيام'],
            [en ? 'Liturgy' : 'حضور القداس', automation.totals.liturgy, en ? 'times' : 'مرات'],
            [en ? 'Prayer' : 'الصلاة', automation.totals.prayer, en ? 'days' : 'أيام'],
            [en ? 'Agpeya hours' : 'ساعات الأجبية', automation.totals.agpeya, en ? 'hours' : 'ساعات']
          ].map(([label, value, suffix]) => <div key={label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e8ecf3]"><p className="text-xs text-[#8b96aa]">{label}</p><p className="mt-1 text-2xl font-black">{value}<span className="ms-1 text-xs font-medium text-[#8b96aa]">{suffix}</span></p></div>)}
        </section>
      )}

      {!loading && (
        <section className="mt-5 rounded-[1.6rem] bg-[#eee9f6] p-5 text-[#51406e]">
          <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-xl">✧</span><div><p className="font-black">{en ? 'Journal buddy' : 'رفيق النوتة'}</p><p className="text-[11px] text-[#897c9e]">{en ? 'An automatic recap, no math needed' : 'ملخص تلقائي من غير ما تحتاج تحسب حاجة'}</p></div></div>
          <p className="mt-3 text-sm leading-6">{en ? automation.nextStepEn : automation.nextStep}</p>
          <p className="mt-2 text-[11px] text-[#897c9e]">{en ? 'This is a personal organizer, not a spiritual score.' : 'الأرقام دي للتنظيم الشخصي، مش تقييم روحي.'}</p>
        </section>
      )}
    </main>
  )
}
