'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SuggestionsPage() {
  const [admins, setAdmins] = useState([])
  const [selected, setSelected] = useState([])
  const [content, setContent] = useState('')
  const [anon, setAnon] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    createClient().rpc('get_active_suggestion_admins').then(({ data }) => setAdmins(data || []))
  }, [])

  function toggleAdmin(id) {
    setSelected(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id])
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (content.trim().length < 5) return setError('اكتب اقتراحك بشكل أوضح شوية.')
    if (!selected.length) return setError('اختار مسؤول واحد على الأقل عشان يستلم اقتراحك.')
    setBusy(true)
    const { error: submitError } = await createClient().rpc('submit_suggestion', {
      p_content: content.trim(),
      p_is_anonymous: anon,
      p_admin_ids: selected
    })
    setBusy(false)
    if (submitError) return setError('ماقدرناش نبعت الاقتراح. حدّث الصفحة وحاول تاني.')
    setContent('')
    setSelected([])
    setDone(true)
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-white px-5 py-6">
      <Link href="/dashboard" className="text-sm underline">رجوع</Link>
      <h1 className="mt-4 text-2xl font-bold">المقترحات</h1>
      <p className="mt-1 text-navy/70">فكرة، ملاحظة، أو طلب للفريق. اختار المسؤولين اللي تحب يوصلهم اقتراحك.</p>
      {done ? (
        <div className="mt-6 space-y-4">
          <p className="alert-ok" role="status">وصل اقتراحك للمسؤولين اللي اخترتهم. شكراً ليك.</p>
          <button className="btn btn-navy" onClick={() => setDone(false)}>اقتراح تاني</button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <textarea className="input min-h-40" required maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)} placeholder="اكتب اقتراحك هنا" aria-label="الاقتراح" />
          <section className="space-y-2">
            <p className="font-bold">إرسال إلى</p>
            <div className="max-h-52 space-y-1 overflow-auto rounded-xl bg-ice p-3">
              {admins.map(admin => (
                <label key={admin.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white">
                  <input type="checkbox" className="h-5 w-5 accent-[#10265a]" checked={selected.includes(admin.id)} onChange={() => toggleAdmin(admin.id)} />
                  <span>{admin.full_name}</span>
                </label>
              ))}
              {!admins.length && <p className="text-sm text-navy/60">مفيش مسؤولين متاحين حاليًا.</p>}
            </div>
            <p className="text-xs text-navy/50">القائمة بتتحدّث حسب المسؤولين النشطين في التطبيق.</p>
          </section>
          <label className="flex items-center gap-3 rounded-xl bg-ice p-4">
            <input type="checkbox" className="h-5 w-5 accent-[#10265a]" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            <span>ابعته من غير اسمي</span>
          </label>
          {error && <p className="alert-error" role="alert">{error}</p>}
          <button className="btn btn-red" disabled={busy || !admins.length}>{busy ? 'جاري الإرسال...' : 'إرسال الاقتراح'}</button>
        </form>
      )}
    </main>
  )
}
