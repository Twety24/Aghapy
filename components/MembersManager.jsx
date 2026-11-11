'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STAGE = { prep: 'إعدادي', secondary: 'ثانوي', university: 'جامعة', graduated: 'خريج' }
const DEPT = { acting: 'تمثيل', scenography: 'سينغرافيا', media: 'ميديا', music_prep: 'إعداد موسيقى', other: 'أخرى' }
const LEVEL = { admin: 'أدمن', senior_admin: 'أدمن متوسط', super_admin: 'Super Admin' }
const birthDate = (value) => {
  if (!value) return 'غير مسجل'
  const [year, month, day] = value.split('-')
  return day + '/' + month + '/' + year
}

export default function MembersManager() {
  const [rows, setRows] = useState([])
  const [permissions, setPermissions] = useState({ isRoot: false, isSenior: false, userId: null })
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [openId, setOpenId] = useState(null)
  const [hist, setHist] = useState([])
  const [busyId, setBusyId] = useState(null)
  const load = useCallback(async () => {
    const res = await fetch('/api/admin/members', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return setMsg(json.message || 'تعذر تحميل الأعضاء.')
    setRows(json.members || [])
    setPermissions(json.permissions || { isRoot: false, isSenior: false, userId: null })
  }, [])
  useEffect(() => { load() }, [load])

  async function update(member, action, value) {
    setMsg('')
    setBusyId(member.id)
    const res = await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: member.id, action, value })
    })
    const json = await res.json().catch(() => ({}))
    setBusyId(null)
    if (!res.ok) return setMsg(json.message || 'ماقدرناش ننفّذ التعديل.')
    await load()
  }

  function rename(member) {
    const name = prompt('الاسم الجديد', member.full_name)
    if (name && name.trim().length >= 3) update(member, 'rename', name.trim())
  }

  async function history(id) {
    if (openId === id) return setOpenId(null)
    const { data } = await createClient().from('attendance_records').select('status, checked_in_at, attendance_sessions(meeting_date)').eq('user_id', id)
    const date = (x) => (Array.isArray(x.attendance_sessions) ? x.attendance_sessions[0] : x.attendance_sessions)?.meeting_date || ''
    setHist((data || []).sort((a, b) => date(b).localeCompare(date(a))).map((x) => ({ date: date(x), status: x.status })))
    setOpenId(id)
  }

  const searchable = (m) => [m.full_name, ...(permissions.isSenior ? [m.email, m.phone, m.address] : [])].filter(Boolean).join(' ').toLowerCase()
  const list = rows.filter((m) => searchable(m).includes(q.trim().toLowerCase()))
  const btn = 'rounded-lg px-3 py-1.5 text-sm ring-1 ring-navy/20 hover:bg-ice disabled:opacity-50'
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">الأعضاء ({rows.length})</h1>
        {permissions.isSenior && <a href="/api/admin/members/export" className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white">تصدير Excel</a>}
      </div>
      <input className="input" placeholder={permissions.isSenior ? 'ابحث بالاسم أو البريد أو التليفون أو العنوان' : 'ابحث بالاسم'} value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث" />
      <p className="rounded-xl bg-white p-3 text-sm text-navy/70 ring-1 ring-navy/10">
        {permissions.isRoot ? 'تقدر تعيّن أدمن عادي أو متوسط، وتدير مستويات الأدمن.' : 'تقدر ترقّي عضو لأدمن عادي. بيانات التواصل متاحة للمسؤولين ذوي الصلاحية فقط.'}
      </p>
      {msg && <p className="alert-error" role="alert">{msg}</p>}
      {list.map((m) => (
        <article key={m.id} className="rounded-2xl bg-white p-4 ring-1 ring-navy/10">
          <div className="flex items-center gap-3">
            <img src={m.avatar_url || '/logo.jpg'} alt="" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/logo.jpg'}} className="h-14 w-14 shrink-0 rounded-full border border-navy/10 bg-white object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{m.full_name}</span>
                {m.role === 'admin' && <span className="rounded-full bg-navy px-2 py-0.5 text-xs text-white">{LEVEL[m.admin_level] || 'أدمن'}</span>}
                {!m.is_active && <span className="rounded-full bg-stage px-2 py-0.5 text-xs text-white">موقوف</span>}
              </div>
              {permissions.isSenior && <p className="text-sm text-navy/60" dir="ltr" style={{ textAlign: 'right' }}>{m.email || '—'}</p>}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-navy/70 sm:grid-cols-2">
            {permissions.isSenior && <p>التليفون: <b dir="ltr">{m.phone || 'غير مسجل'}</b></p>}
            {permissions.isSenior && <p>العنوان: <b>{m.address || 'غير مسجل'}</b></p>}
            <p>تاريخ الميلاد: <b>{birthDate(m.birth_date)}</b></p>
            <p>المرحلة: <b>{STAGE[m.stage] || 'غير محدد'}</b></p>
            <p>القسم: <b>{DEPT[m.department] || 'غير محدد'}</b></p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn} disabled={busyId === m.id} onClick={() => rename(m)}>تعديل الاسم</button>
            <button className={btn} disabled={busyId === m.id} onClick={() => history(m.id)}>سجل الحضور</button>
            {m.role === 'member' && <button className={btn} disabled={busyId === m.id} onClick={() => update(m, 'promote-normal')}>ترقية لأدمن عادي</button>}
            {permissions.isRoot && m.role === 'member' && <button className={btn} disabled={busyId === m.id} onClick={() => update(m, 'promote-senior')}>ترقية لأدمن متوسط</button>}
            {permissions.isRoot && m.role === 'admin' && !m.is_root && <button className={btn} disabled={busyId === m.id} onClick={() => update(m, 'demote')}>إزالة صلاحية الأدمن</button>}
            {m.role === 'member' && m.id !== permissions.userId && <button className={btn} disabled={busyId === m.id} onClick={() => update(m, 'toggle-active')}>{m.is_active ? 'إيقاف' : 'تفعيل'}</button>}
          </div>
          {openId === m.id && <ul className="mt-3 space-y-1 border-t border-navy/10 pt-3 text-sm">{hist.map((h, i) => <li key={i} className="flex justify-between"><span>{h.date}</span><span className={h.status === 'present' ? 'text-green-700' : 'text-stage'}>{h.status === 'present' ? 'حاضر' : 'غائب'}</span></li>)}{!hist.length && <li className="text-navy/60">مفيش سجل لسه.</li>}</ul>}
        </article>
      ))}
    </div>
  )
}
