'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SupportViewer({ sessionId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function load() {
    const res = await fetch('/api/admin/support/' + sessionId, { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setData(null); setError(json.message || 'تعذر فتح جلسة الدعم.'); return false }
    setError('')
    setData(json)
    return true
  }
  useEffect(() => {
    let active = true
    const run = async () => { if (active) await load() }
    run()
    const interval = setInterval(run, 10000)
    return () => { active = false; clearInterval(interval) }
  }, [sessionId])
  useEffect(() => {
    if (!data?.session?.expires_at) return
    const remaining = new Date(data.session.expires_at).getTime() - Date.now()
    const timeout = setTimeout(() => { setData(null); setError('انتهت جلسة الدعم.') }, Math.max(0, remaining))
    return () => clearTimeout(timeout)
  }, [data?.session?.expires_at])
  async function end() {
    setBusy(true)
    const res = await fetch('/api/admin/support/' + sessionId, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) { setData(null); setError('تم إنهاء جلسة الدعم.'); return }
    setError('تعذر إنهاء جلسة الدعم.')
  }
  if (error && !data) return <section className="rounded-2xl bg-white p-5"><p role="alert">{error}</p><Link className="mt-3 inline-block text-stage underline" href="/admin/members">العودة للأعضاء</Link></section>
  if (!data) return <p className="p-5">جاري تحميل وضع الدعم...</p>
  const member = data.member
  return <div className="mx-auto max-w-3xl space-y-4">
    <header className="rounded-2xl border-2 border-stage bg-white p-4">
      <p className="text-xs font-black tracking-wider text-stage">SUPPORT MODE · READ ONLY</p>
      <h1 className="mt-1 text-xl font-black text-navy">عرض بيانات العضو بموافقته</h1>
      <p className="mt-1 text-sm text-navy/70">الجلسة مؤقتة ومسجلة في سجل التدقيق. لا يمكنك تعديل بيانات العضو أو تنفيذ إجراءات بحسابه.</p>
      <p className="mt-2 text-xs text-navy/60">تنتهي الجلسة: {new Date(data.session.expires_at).toLocaleString('ar-EG')}</p>
      <button onClick={end} disabled={busy} className="btn btn-red mt-3">{busy ? 'جاري الإنهاء...' : 'إنهاء جلسة الدعم'}</button>
    </header>
    <section className="rounded-2xl bg-white p-5">
      <div className="flex items-center gap-3"><img src={member.avatar_url || '/logo.jpg'} alt="" className="h-16 w-16 rounded-full object-cover"/><div><h2 className="font-bold text-navy">{member.full_name}</h2><p className="text-xs text-navy/60">بيانات الملف الشخصي</p></div></div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-navy/55">رقم الهاتف</dt><dd>{member.phone || 'غير مسجل'}</dd></div>
        <div><dt className="text-navy/55">العنوان</dt><dd>{member.address || 'غير مسجل'}</dd></div>
        <div><dt className="text-navy/55">تاريخ الميلاد</dt><dd>{member.birth_date || 'غير مسجل'}</dd></div>
        <div><dt className="text-navy/55">المرحلة</dt><dd>{member.stage || 'غير محدد'}</dd></div>
        <div><dt className="text-navy/55">القسم</dt><dd>{member.department || 'غير محدد'}</dd></div>
      </dl>
    </section>
    <section className="rounded-2xl bg-white p-5">
      <h2 className="font-bold text-navy">سجل الحضور (آخر 20 سجلًا)</h2>
      <ul className="mt-3 divide-y divide-navy/10">{data.attendance.map((row, i) => {
        const session = Array.isArray(row.attendance_sessions) ? row.attendance_sessions[0] : row.attendance_sessions
        return <li key={i} className="flex justify-between gap-3 py-2 text-sm"><span>{session?.meeting_date || 'بدون تاريخ'} · {session?.title || 'اجتماع'}</span><span>{row.status === 'present' ? 'حاضر' : 'غائب'}</span></li>
      })}{!data.attendance.length && <li className="py-3 text-sm text-navy/60">لا يوجد سجل حضور.</li>}</ul>
    </section>
    {error && <p role="status" className="text-sm text-stage">{error}</p>}
  </div>
}
