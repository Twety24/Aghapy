import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/guard'

export const dynamic = 'force-dynamic'
const one = (x) => (Array.isArray(x) ? x[0] : x)

export default async function Suggestions() {
  const context = await getAdminContext()
  if (!context) return null
  const db = await createClient()
  let query = db.from('suggestions')
    .select('id, content, created_at, is_anonymous, profiles(full_name), suggestion_recipients!inner(admin_id)')
    .order('created_at', { ascending: false })
  if (!context.profile.is_root) query = query.eq('suggestion_recipients.admin_id', context.user.id)
  const { data } = await query
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">المقترحات ({data?.length || 0})</h1>
      {(data || []).map((suggestion) => (
        <article key={suggestion.id} className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
          <p className="whitespace-pre-wrap leading-7">{suggestion.content}</p>
          <p className="mt-3 text-sm text-navy/60">
            {suggestion.is_anonymous ? 'مجهول' : one(suggestion.profiles)?.full_name || '—'} · {new Date(suggestion.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </article>
      ))}
      {!data?.length && <p className="rounded-xl bg-white p-6 text-center text-navy/60">مفيش مقترحات موجهة ليك لسه.</p>}
    </div>
  )
}
