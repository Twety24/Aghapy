'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'

const fmt = (d) => new Date(d).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' })

export default function AdminAttendance({ initial, allowTest }) {
  const [session, setSession] = useState(initial)
  const [qr, setQr] = useState('')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const live = session && session.status === 'open' && new Date() < new Date(session.ends_at)

  async function create(test) {
    setBusy(true); setMsg('')
    const res = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setMsg(j.message || 'حصل خطأ.')
    setSession(j.session)
  }

  async function closeNow() {
    if (!confirm('تقفل الجلسة دلوقتي وتطلع التقارير وتبعت الإيميل؟ (تجريبي)')) return
    setBusy(true); setMsg(''); setNote('')
    const res = await fetch('/api/admin/session/close', { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setMsg(j.message || 'حصل خطأ.')
    setSession({ ...session, status: 'closed' }); setNote('اتقفلت الجلسة وطلعت التقارير. شوفها في صفحة التقارير.')
  }

  const refreshQr = useCallback(async () => {
    if (!session) return
    const res = await fetch(`/api/admin/token?sessionId=${session.id}`, { cache: 'no-store' })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setQr(''); setMsg(j.message || ''); return }
    setMsg(''); setQr(await QRCode.toDataURL(j.token, { width: 480, margin: 2, errorCorrectionLevel: 'M' }))
  }, [session])

  const refreshList = useCallback(async () => {
    if (!session) return
    const db = createClient()
    const [{ data }, { count }] = await Promise.all([
      db.from('attendance_records').select('user_id, full_name, checked_in_at').eq('session_id', session.id).eq('status', 'present').order('checked_in_at', { ascending: false }),
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true)
    ])
    setRows(data || []); setTotal(count || 0)
  }, [session])

  useEffect(() => {
    refreshList()
    const a = setInterval(refreshList, 5000)
    let b
    if (live) { refreshQr(); b = setInterval(refreshQr, 15000) }
    return () => { clearInterval(a); clearInterval(b) }
  }, [live, refreshQr, refreshList])

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">جلسة الحضور</h1>

      {!live && (
        <div className="mt-6 space-y-3 rounded-2xl bg-white p-6 ring-1 ring-navy/10">
          <p>{session ? `آخر جلسة: ${session.meeting_date} (${session.status === 'closed' ? 'مقفولة' : 'انتهى وقتها'})` : 'مفيش جلسات لسه.'}</p>
          <button className="btn btn-red" onClick={() => create(false)} disabled={busy}>إنشاء جلسة السبت (6 – 11 مساءً)</button>
          {allowTest && <button className="btn btn-navy" onClick={() => create(true)} disabled={busy}>جلسة تجريبية (ساعتين من دلوقتي)</button>}
        </div>
      )}
      {msg && <p className="alert-error mt-4" role="alert">{msg}</p>}
      {note && <p className="alert-ok mt-4" role="status">{note}</p>}

      {live && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 text-center ring-1 ring-navy/10">
            {qr ? <img src={qr} alt="كود الحضور" className="mx-auto w-full max-w-xs" /> : <p className="py-20 text-navy/60">جاري تحميل الكود...</p>}
            <p className="mt-3 text-sm text-navy/70">الكود بيتغيّر كل 30 ثانية تقريباً. التسجيل مفتوح لحد {fmt(session.ends_at)}.</p>
          </section>
          <section className="rounded-2xl bg-white p-6 ring-1 ring-navy/10">
            <p className="text-lg font-bold">حضر {rows.length} من {total}</p>
            <ul className="mt-3 max-h-96 space-y-2 overflow-auto">
              {rows.map((r) => (
                <li key={r.user_id} className="flex justify-between rounded-lg bg-ice px-3 py-2 text-sm">
                  <span>{r.full_name}</span><span className="text-navy/60">{fmt(r.checked_in_at)}</span>
                </li>
              ))}
              {!rows.length && <li className="text-sm text-navy/60">لسه محدش سجّل.</li>}
            </ul>
          </section>
        </div>
      )}
      {live && allowTest && <button className="btn btn-navy mt-6" onClick={closeNow} disabled={busy}>إنهاء الجلسة الآن وتوليد التقارير (تجريبي)</button>}
    </div>
  )
}
