'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {useT} from '@/components/LangProvider'

const STAGE = { prep: 'إعدادي', secondary: 'ثانوي', university: 'جامعة', graduated: 'خريج' }
const DEPT = { acting: 'تمثيل', scenography: 'سينغرافيا', media: 'ميديا', music_prep: 'إعداد موسيقى', other: 'أخرى' }
const birthDate = (value) => {
  if (!value) return 'Not provided'
  const [year, month, day] = value.split('-')
  return day + '/' + month + '/' + year
}

export default function MembersManager() {
  const {lang}=useT();const en=lang==='en';const supportLabel=en?'Request support':'طلب وضع الدعم';const c=en?{unregistered:'Not provided',loadError:'Unable to load members.',updateError:'The update could not be completed.',rename:'New name',members:'Members',export:'Export Excel',search:'Search by name, email, phone, or address',root:'You are the Super Admin. You can manage all administrators, and your account is protected from permission changes.',admin:'You can promote members to administrators or remove administrator access from other administrators. The Super Admin account is protected.',administrator:'Administrator',suspended:'Suspended',phone:'Phone',address:'Address',dob:'Date of birth',stage:'Education stage',department:'Department',edit:'Edit name',history:'Attendance history',promote:'Promote to administrator',demote:'Remove administrator access',disable:'Suspend',enable:'Activate',present:'Present',absent:'Absent',noHistory:'No attendance records yet.',undefined:'Not specified'}:{unregistered:'غير مسجل',loadError:'تعذر تحميل الأعضاء.',updateError:'ماقدرناش ننفّذ التعديل.',rename:'الاسم الجديد',members:'الأعضاء',export:'تصدير Excel',search:'ابحث بالاسم أو البريد أو التليفون أو العنوان',root:'أنت Super Admin. تقدر تدير كل الأدمنز، وحسابك محمي من أي تعديل في الصلاحيات.',admin:'تقدر ترقّي أي عضو لأدمن أو تشيل صلاحية الأدمن من أي أدمن آخر. حساب Super Admin محمي.',administrator:'أدمن',suspended:'موقوف',phone:'التليفون',address:'العنوان',dob:'تاريخ الميلاد',stage:'المرحلة',department:'القسم',edit:'تعديل الاسم',history:'سجل الحضور',promote:'ترقية لأدمن',demote:'إزالة صلاحية الأدمن',disable:'إيقاف',enable:'تفعيل',present:'حاضر',absent:'غائب',noHistory:'مفيش سجل لسه.',undefined:'غير محدد'};
  const [rows, setRows] = useState([])
  const [permissions, setPermissions] = useState({ isRoot: false, userId: null })
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [openId, setOpenId] = useState(null)
  const [hist, setHist] = useState([])
  const [busyId, setBusyId] = useState(null)
  const load = useCallback(async () => {
    const res = await fetch('/api/admin/members', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return setMsg(json.message || c.loadError)
    setRows(json.members || [])
    setPermissions(json.permissions || { isRoot: false, userId: null })
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
    if (!res.ok) return setMsg(json.message || c.updateError)
    await load()
  }

  async function requestSupport(member) {
    setMsg('')
    setBusyId(member.id)
    const res = await fetch('/api/admin/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: member.id }) })
    const json = await res.json().catch(() => ({}))
    setBusyId(null)
    if (!res.ok) return setMsg(json.message || c.updateError)
    setMsg(en ? 'Support request sent. The member must approve it first.' : 'تم إرسال طلب الدعم. العضو لازم يوافق عليه الأول.')
  }

  function rename(member) {
    const name = prompt(c.rename, member.full_name)
    if (name && name.trim().length >= 3) update(member, 'rename', name.trim())
  }

  async function history(id) {
    if (openId === id) return setOpenId(null)
    const { data } = await createClient().from('attendance_records').select('status, checked_in_at, attendance_sessions(meeting_date)').eq('user_id', id)
    const date = (x) => (Array.isArray(x.attendance_sessions) ? x.attendance_sessions[0] : x.attendance_sessions)?.meeting_date || ''
    setHist((data || []).sort((a, b) => date(b).localeCompare(date(a))).map((x) => ({ date: date(x), status: x.status })))
    setOpenId(id)
  }

  const searchable = (m) => [m.full_name, m.email, m.phone, m.address].filter(Boolean).join(' ').toLowerCase()
  const list = rows.filter((m) => searchable(m).includes(q.trim().toLowerCase()))
  const btn = 'rounded-lg px-3 py-1.5 text-sm ring-1 ring-navy/20 hover:bg-ice disabled:opacity-50'
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{c.members} ({rows.length})</h1>
        <a href="/api/admin/members/export" className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white">{c.export}</a>
      </div>
      <input className="input" placeholder={c.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={c.search} />
      <p className="rounded-xl bg-white p-3 text-sm text-navy/70 ring-1 ring-navy/10">
        {permissions.isRoot ? c.root : c.admin}
      </p>
      {msg && <p className="alert-error" role="alert">{msg}</p>}
      {list.map((m) => (
        <article key={m.id} className="rounded-2xl bg-white p-4 ring-1 ring-navy/10">
          <div className="flex items-center gap-3">
            <img src={m.avatar_url || '/logo.jpg'} alt="" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/logo.jpg'}} className="h-14 w-14 shrink-0 rounded-full border border-navy/10 bg-white object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{m.full_name}</span>
                {m.role === 'admin' && <span className="rounded-full bg-navy px-2 py-0.5 text-xs text-white">{m.is_root ? 'Super Admin' : c.administrator}</span>}
                {!m.is_active && <span className="rounded-full bg-stage px-2 py-0.5 text-xs text-white">{c.suspended}</span>}
              </div>
              <p className="text-sm text-navy/60" dir="ltr" style={{ textAlign: 'right' }}>{m.email || '—'}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-navy/70 sm:grid-cols-2">
            <p>{c.phone}: <b dir="ltr">{m.phone || c.unregistered}</b></p>
            <p>{c.address}: <b>{m.address || c.unregistered}</b></p>
            <p>{c.dob}: <b>{birthDate(m.birth_date)}</b></p>
            <p>{c.stage}: <b>{en ? ({prep:'Preparatory',secondary:'Secondary',university:'University',graduated:'Graduate'}[m.stage]||c.undefined) : (STAGE[m.stage]||c.undefined)}</b></p>
            <p>{c.department}: <b>{en ? ({acting:'Acting',scenography:'Scenography',media:'Media',music_prep:'Music preparation',other:'Other'}[m.department]||c.undefined) : (DEPT[m.department]||c.undefined)}</b></p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn} disabled={busyId === m.id} onClick={() => rename(m)}>{c.edit}</button>
            <button className={btn} disabled={busyId === m.id} onClick={() => history(m.id)}>{c.history}</button>
            {permissions.isRoot && m.role === 'member' && m.is_active && <button className={btn} disabled={busyId === m.id} onClick={() => requestSupport(m)}>{supportLabel}</button>}
            {m.role === 'member' && <button className={btn} disabled={busyId === m.id} onClick={() => update(m, 'promote-normal')}>{c.promote}</button>}
            {m.role === 'admin' && !m.is_root && <button className={btn} disabled={busyId === m.id} onClick={() => update(m, 'demote')}>{c.demote}</button>}
            {m.role === 'member' && m.id !== permissions.userId && <button className={btn} disabled={busyId === m.id} onClick={() => update(m, 'toggle-active')}>{m.is_active ? c.disable : c.enable}</button>}
          </div>
          {openId === m.id && <ul className="mt-3 space-y-1 border-t border-navy/10 pt-3 text-sm">{hist.map((h, i) => <li key={i} className="flex justify-between"><span>{h.date}</span><span className={h.status === 'present' ? 'text-green-700' : 'text-stage'}>{h.status === 'present' ? c.present : c.absent}</span></li>)}{!hist.length && <li className="text-navy/60">مفيش سجل لسه.</li>}</ul>}
        </article>
      ))}
    </div>
  )
}
