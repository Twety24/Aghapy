'use client'
import { useEffect, useState } from 'react'

export default function SupportRequests() {
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  async function load() {
    const res = await fetch('/api/support/requests', { cache: 'no-store' })
    if (!res.ok) return
    const json = await res.json()
    setItems(json.requests || [])
  }
  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])
  async function decide(id, decision) {
    setBusy(id)
    setMessage('')
    const res = await fetch('/api/support/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: id, decision }) })
    const json = await res.json().catch(() => ({}))
    setBusy('')
    if (!res.ok) { setMessage(json.message || 'تعذر تحديث الطلب.'); await load(); return }
    await load()
    setMessage(decision === 'accept' ? 'وافقت على طلب الدعم. الجلسة للعرض فقط وتنتهي تلقائيًا بعد 15 دقيقة.' : decision === 'decline' ? 'تم رفض طلب الدعم.' : 'تم إلغاء موافقتك وإنهاء جلسة الدعم.')
  }
  if (!items.length && !message) return null
  return <section className="space-y-3 rounded-2xl border border-stage/20 bg-white p-4 shadow-sm">
    <div><h2 className="font-bold text-navy">طلبات ووضع الدعم</h2><p className="mt-1 text-sm text-navy/65">لن يتمكن الأدمن من رؤية بيانات الدعم إلا بعد موافقتك. يمكنك إنهاء الجلسة في أي وقت.</p></div>
    {items.map(item => <article key={item.id} className="rounded-xl bg-ice p-3">
      <p className="font-bold text-navy">{item.admin?.full_name || 'أحد مسؤولي الإدارة'}</p>
      {item.status === 'pending' ? <>
        <p className="mt-1 text-sm text-navy/65">طلب فتح وضع دعم مؤقت لمساعدتك في حل مشكلة داخل التطبيق.</p>
        <div className="mt-3 flex gap-2"><button disabled={busy === item.id} onClick={() => decide(item.id, 'accept')} className="btn btn-red">موافقة</button><button disabled={busy === item.id} onClick={() => decide(item.id, 'decline')} className="btn btn-navy">رفض</button></div>
      </> : <>
        <p className="mt-1 text-sm text-navy/65">وضع الدعم نشط بموافقتك، والأدمن يستطيع عرض بيانات محدودة فقط.</p>
        <button disabled={busy === item.id} onClick={() => decide(item.id, 'revoke')} className="btn btn-red mt-3">إنهاء الدعم الآن</button>
      </>}
    </article>)}
    {message && <p role="status" className="text-sm text-navy/70">{message}</p>}
  </section>
}
