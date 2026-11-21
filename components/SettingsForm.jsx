'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {useT} from '@/components/LangProvider'

export default function SettingsForm({ initial }) {
  const {lang}=useT();const en=lang==='en'
  const [email, setEmail] = useState(initial)
  const [msg, setMsg] = useState({ ok: false, text: '' })
  const [busy, setBusy] = useState(false)
  async function save(e) {
    e.preventDefault(); setBusy(true)
    const { error } = await createClient().from('settings').upsert({ key: 'admin_report_email', value: email.trim(), updated_at: new Date().toISOString() })
    setBusy(false)
    setMsg(error ? { ok: false, text: (en?'Unable to save changes.':'ماقدرناش نحفظ.') } : { ok: true, text: (en?'Saved successfully.':'اتحفظ.') })
  }
  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-navy/10">
      <label className="label" htmlFor="rep">{en?'Administrator email address for receiving Excel reports after each session closes':'بريد الأدمن اللي هيوصله تقرير Excel بعد إغلاق كل جلسة'}</label>
      <input id="rep" type="email" required dir="ltr" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      {msg.text && <p className={msg.ok ? 'alert-ok' : 'alert-error'} role="status">{msg.text}</p>}
      <button className="btn btn-navy" disabled={busy}{en?'Save':'حفظ'}</button>
    </form>
  )
}
