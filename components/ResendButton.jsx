'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResendButton({ sessionId }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function go() {
    setBusy(true); setMsg('')
    const res = await fetch('/api/admin/reports/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) })
    const j = await res.json().catch(() => ({}))
    setMsg(j.message || 'حصل خطأ.'); setBusy(false); router.refresh()
  }
  return (
    <span>
      <button onClick={go} disabled={busy} className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-navy/20 hover:bg-ice disabled:opacity-60">{busy ? 'جاري الإرسال...' : 'إعادة إرسال الإيميل'}</button>
      {msg && <span className="mr-2 text-sm text-navy/70" role="status">{msg}</span>}
    </span>
  )
}
