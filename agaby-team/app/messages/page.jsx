import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessageList from '@/components/MessageList'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const supabase = (await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('message_recipients')
    .select('id, read_at, messages(title, body, created_at)')
    .eq('user_id', user.id)

  const items = (data || [])
    .filter((r) => r.messages)
    .map((r) => ({ id: r.id, read_at: r.read_at, ...r.messages }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-white px-5 py-6">
      <Link href="/dashboard" className="text-sm underline">رجوع</Link>
      <h1 className="mt-4 text-2xl font-bold">الرسائل</h1>
      <p className="mt-1 text-navy/70">رسائل من المسؤول. للقراءة فقط.</p>
      <MessageList items={items} />
    </main>
  )
}
