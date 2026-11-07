import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
const one = (x) => (Array.isArray(x) ? x[0] : x)

export default async function Suggestions() {
  const { data } = await (await createClient()).from('suggestions').select('id, content, created_at, is_anonymous, profiles(full_name)').order('created_at', { ascending: false })
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">المقترحات ({data?.length || 0})</h1>
      {(data || []).map((s) => (
        <article key={s.id} className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
          <p className="whitespace-pre-wrap leading-7">{s.content}</p>
          <p className="mt-3 text-sm text-navy/60">{s.is_anonymous ? 'مجهول' : one(s.profiles)?.full_name || '—'} · {new Date(s.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' })}</p>
        </article>
      ))}
      {!data?.length && <p className="rounded-xl bg-white p-6 text-center text-navy/60">مفيش مقترحات لسه.</p>}
    </div>
  )
}
