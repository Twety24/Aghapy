'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STAGES = [
  { value: 'prep', label: 'إعدادي' },
  { value: 'secondary', label: 'ثانوي' },
  { value: 'university', label: 'جامعة' },
  { value: 'working', label: 'بشتغل' }
]
const DEPARTMENTS = [
  { value: 'acting', label: 'تمثيل' },
  { value: 'scenography', label: 'سينغرافيا' },
  { value: 'media', label: 'ميديا' },
  { value: 'music_prep', label: 'إعداد موسيقى' },
  { value: 'other', label: 'أخرى' }
]

export default function SendMessageForm({ members, groups = [] }) {
  const router = useRouter()
  const [sel, setSel] = useState(new Set())
  const [q, setQ] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ ok: false, text: '' })

  const shown = useMemo(() => members.filter((m) => (m.full_name + m.email).toLowerCase().includes(q.trim().toLowerCase())), [members, q])
  const allShown = shown.length > 0 && shown.every((m) => sel.has(m.id))
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleCategory = (field, value) => {
    const ids = members.filter((m) => m[field] === value).map((m) => m.id)
    if (!ids.length) return
    setSel((s) => {
      const n = new Set(s)
      const remove = ids.every((id) => n.has(id))
      ids.forEach((id) => remove ? n.delete(id) : n.add(id))
      return n
    })
  }
  const toggleGroup = (group) => {
    const ids = (group.group_members || []).map((m) => m.user_id)
    if (!ids.length) return
    setSel((s) => {
      const n = new Set(s)
      const remove = ids.every((id) => n.has(id))
      ids.forEach((id) => remove ? n.delete(id) : n.add(id))
      return n
    })
  }
  const toggleAll = () => setSel((s) => { const n = new Set(s); shown.forEach((m) => (allShown ? n.delete(m.id) : n.add(m.id))); return n })

  async function send(e) {
    e.preventDefault()
    if (!sel.size) return setMsg({ ok: false, text: 'اختار عضو واحد على الأقل.' })
    setBusy(true); setMsg({ ok: false, text: '' })
    const { error } = await createClient().rpc('send_message', { p_title: title, p_body: body, p_user_ids: [...sel] })
    setBusy(false)
    if (error) return setMsg({ ok: false, text: 'ماقدرناش نبعت الرسالة. اتأكد إن العنوان والنص مكتوبين.' })
    setMsg({ ok: true, text: `اتبعتت لـ ${sel.size} عضو.` }); setTitle(''); setBody(''); setSel(new Set()); router.refresh()
  }

  return (
    <form onSubmit={send} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-navy/10">
      <h2 className="font-bold">رسالة جديدة</h2>
      <div className="space-y-2">
        <p className="text-sm font-bold">اختيار سريع حسب المرحلة</p>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((item) => {
            const count = members.filter((m) => m.stage === item.value).length
            return <button key={item.value} type="button" disabled={!count} onClick={() => toggleCategory('stage', item.value)} className="rounded-full border border-navy/15 px-3 py-1.5 text-sm disabled:opacity-40">{item.label} ({count})</button>
          })}
        </div>
        <p className="text-sm font-bold">اختيار سريع حسب القسم</p>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((item) => {
            const count = members.filter((m) => m.department === item.value).length
            return <button key={item.value} type="button" disabled={!count} onClick={() => toggleCategory('department', item.value)} className="rounded-full border border-navy/15 px-3 py-1.5 text-sm disabled:opacity-40">{item.label} ({count})</button>
          })}
        </div>
      </div>
      {groups.length > 0 && <div className="space-y-2"><p className="text-sm font-bold">اختيار حسب المجموعات</p><div className="flex flex-wrap gap-2">{groups.map((g) => <button key={g.id} type="button" disabled={!g.group_members?.length} onClick={() => toggleGroup(g)} className="rounded-full border border-navy/15 px-3 py-1.5 text-sm disabled:opacity-40">{g.name} ({g.group_members?.length || 0})</button>)}</div></div>}
      <input className="input" placeholder="ابحث عن عضو" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث" />
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" className="h-5 w-5 accent-[#10265a]" checked={allShown} onChange={toggleAll} /> تحديد الكل ({sel.size} مختار)
      </label>
      <ul className="max-h-56 space-y-1 overflow-auto rounded-xl bg-ice p-2">
        {shown.map((m) => (
          <li key={m.id}><label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white">
            <input type="checkbox" className="h-5 w-5 accent-[#10265a]" checked={sel.has(m.id)} onChange={() => toggle(m.id)} />{m.full_name}
          </label></li>
        ))}
      </ul>
      <input className="input" required placeholder="عنوان الرسالة" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input min-h-32" required placeholder="نص الرسالة" value={body} onChange={(e) => setBody(e.target.value)} />
      {msg.text && <p className={msg.ok ? 'alert-ok' : 'alert-error'} role="status">{msg.text}</p>}
      <button className="btn btn-red" disabled={busy}>{busy ? 'جاري الإرسال...' : 'إرسال'}</button>
    </form>
  )
}
