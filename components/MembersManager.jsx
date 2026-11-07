'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MembersManager() {
  const [db] = useState(() => createClient())
  const [rows, setRows] = useState([])
  const [me, setMe] = useState(null)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [openId, setOpenId] = useState(null)
  const [hist, setHist] = useState([])

  const load = useCallback(async () => {
    const [{ data }, { data: u }] = await Promise.all([
      db.from('profiles').select('id, full_name, email, role, is_active, created_at').order('full_name'),
      db.auth.getUser()
    ])
    setRows(data || []); setMe(u.user?.id)
  }, [db])
  useEffect(() => { load() }, [load])

  async function update(id, patch) {
    setMsg('')
    const { error } = await db.from('profiles').update(patch).eq('id', id)
    if (error) setMsg(error.message.includes('أدمن') ? error.message : 'ماقدرناش ننفّذ التعديل.')
    else load()
  }
  function rename(m) {
    const name = prompt('الاسم الجديد', m.full_name)
    if (name && name.trim().length >= 3) update(m.id, { full_name: name.trim() })
  }
  function toggleAdmin(m) {
    const making = m.role !== 'admin'
    if (confirm(making ? `تحوّل ${m.full_name} لأدمن؟ هيقدر يشوف ويعدّل كل حاجة.` : `تشيل صلاحية الأدمن من ${m.full_name}؟`)) update(m.id, { role: making ? 'admin' : 'member' })
  }
  function toggleActive(m) {
    if (confirm(m.is_active ? `توقف حساب ${m.full_name}؟` : `تفعّل حساب ${m.full_name}؟`)) update(m.id, { is_active: !m.is_active })
  }
  async function history(id) {
    if (openId === id) return setOpenId(null)
    const { data } = await db.from('attendance_records').select('status, checked_in_at, attendance_sessions(meeting_date)').eq('user_id', id)
    const d = (x) => (Array.isArray(x.attendance_sessions) ? x.attendance_sessions[0] : x.attendance_sessions)?.meeting_date || ''
    setHist((data || []).sort((a, b) => d(b).localeCompare(d(a))).map((x) => ({ date: d(x), status: x.status })))
    setOpenId(id)
  }

  const list = rows.filter((m) => (m.full_name + m.email).toLowerCase().includes(q.trim().toLowerCase()))
  const btn = 'rounded-lg px-3 py-1.5 text-sm ring-1 ring-navy/20 hover:bg-ice'

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">الأعضاء ({rows.length})</h1>
        <a href="/api/admin/members/export" className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white">تصدير Excel</a>
      </div>
      <input className="input" placeholder="ابحث بالاسم أو البريد" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث" />
      <p className="rounded-xl bg-white p-3 text-sm text-navy/70 ring-1 ring-navy/10">عشان تضيف أدمن: خلّي الشخص يسجّل حساب عادي الأول، وبعدين اضغط "ترقية لأدمن" جنب اسمه.</p>
      {msg && <p className="alert-error" role="alert">{msg}</p>}
      {list.map((m) => (
        <article key={m.id} className="rounded-2xl bg-white p-4 ring-1 ring-navy/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{m.full_name}</span>
            {m.role === 'admin' && <span className="rounded-full bg-navy px-2 py-0.5 text-xs text-white">أدمن</span>}
            {!m.is_active && <span className="rounded-full bg-stage px-2 py-0.5 text-xs text-white">موقوف</span>}
          </div>
          <p className="text-sm text-navy/60" dir="ltr" style={{ textAlign: 'right' }}>{m.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn} onClick={() => rename(m)}>تعديل الاسم</button>
            <button className={btn} onClick={() => history(m.id)}>سجل الحضور</button>
            {m.id !== me && <button className={btn} onClick={() => toggleAdmin(m)}>{m.role === 'admin' ? 'إزالة الأدمن' : 'ترقية لأدمن'}</button>}
            {m.id !== me && <button className={btn} onClick={() => toggleActive(m)}>{m.is_active ? 'إيقاف' : 'تفعيل'}</button>}
          </div>
          {openId === m.id && (
            <ul className="mt-3 space-y-1 border-t border-navy/10 pt-3 text-sm">
              {hist.map((h, i) => <li key={i} className="flex justify-between"><span>{h.date}</span><span className={h.status === 'present' ? 'text-green-700' : 'text-stage'}>{h.status === 'present' ? 'حاضر' : 'غائب'}</span></li>)}
              {!hist.length && <li className="text-navy/60">مفيش سجل لسه.</li>}
            </ul>
          )}
        </article>
      ))}
    </div>
  )
}
