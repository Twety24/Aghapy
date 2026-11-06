'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SuggestionsPage() {
  const [content, setContent] = useState('')
  const [anon, setAnon] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (content.trim().length < 5) return setError('اكتب اقتراحك بشكل أوضح شوية.')
    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('suggestions').insert({
      user_id: anon ? null : user.id,
      is_anonymous: anon,
      content: content.trim()
    })
    setBusy(false)
    if (error) return setError('ماقدرناش نبعت الاقتراح. جرّب تاني.')
    setContent(''); setDone(true)
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-white px-5 py-6">
      <Link href="/dashboard" className="text-sm underline">رجوع</Link>
      <h1 className="mt-4 text-2xl font-bold">المقترحات</h1>
      <p className="mt-1 text-navy/70">فكرة، ملاحظة، أو طلب للفريق. المسؤول هو اللي هيقرأها.</p>
      {done ? (
        <div className="mt-6 space-y-4">
          <p className="alert-ok" role="status">وصل اقتراحك. شكراً ليك.</p>
          <button className="btn btn-navy" onClick={() => setDone(false)}>اقتراح تاني</button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <textarea className="input min-h-40" required value={content} onChange={(e) => setContent(e.target.value)} placeholder="اكتب اقتراحك هنا" aria-label="الاقتراح" />
          <label className="flex items-center gap-3 rounded-xl bg-ice p-4">
            <input type="checkbox" className="h-5 w-5 accent-[#10265a]" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            <span>ابعته من غير اسمي</span>
          </label>
          {error && <p className="alert-error" role="alert">{error}</p>}
          <button className="btn btn-red" disabled={busy}>{busy ? 'جاري الإرسال...' : 'إرسال الاقتراح'}</button>
        </form>
      )}
    </main>
  )
}
