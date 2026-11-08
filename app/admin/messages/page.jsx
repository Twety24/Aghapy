import { createClient } from '@/lib/supabase/server'
import SendMessageForm from '@/components/SendMessageForm'

export const dynamic = 'force-dynamic'
const one = (x) => (Array.isArray(x) ? x[0] : x)

export default async function Page() {
  const db = await createClient()
  const [{ data: members }, { data: sent }] = await Promise.all([
    db.from('profiles').select('id, full_name, email, stage, department').eq('is_active', true).order('full_name'),
    db.from('messages').select('id, title, body, created_at, message_recipients(read_at, profiles(full_name))').order('created_at', { ascending: false }).limit(20)
  ])
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">الرسائل</h1>
      <SendMessageForm members={members || []} />
      <h2 className="font-bold">اللي اتبعت</h2>
      {(sent || []).map((m) => {
        const rs = m.message_recipients || []
        const read = rs.filter((r) => r.read_at)
        const unread = rs.filter((r) => !r.read_at)
        return (
          <details key={m.id} className="rounded-2xl bg-white p-4 ring-1 ring-navy/10">
            <summary className="cursor-pointer font-bold">{m.title} <span className="text-sm font-normal text-navy/60">· قرأها {read.length} من {rs.length}</span></summary>
            <p className="mt-3 whitespace-pre-wrap leading-7">{m.body}</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div><p className="font-bold text-green-700">قرأوا</p>{read.map((r, i) => <p key={i}>{one(r.profiles)?.full_name}</p>)}</div>
              <div><p className="font-bold text-stage">لسه</p>{unread.map((r, i) => <p key={i}>{one(r.profiles)?.full_name}</p>)}</div>
            </div>
          </details>
        )
      })}
      {!sent?.length && <p className="rounded-xl bg-white p-6 text-center text-navy/60">لسه ما بعتّش رسايل.</p>}
    </div>
  )
}
