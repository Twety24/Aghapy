import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessageList from '@/components/MessageList'
import AppPageShell from '@/components/AppPageShell'
import { getLang } from '@/lib/lang'
export const dynamic = 'force-dynamic'
export default async function MessagesPage() {
  const en = (await getLang()) === 'en'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data } = await supabase.from('message_recipients').select('id,message_id,read_at,messages(title,body,created_at)').eq('user_id',user.id)
  const items = (data || []).filter(r=>r.messages).map(r=>({id:r.id,message_id:r.message_id,read_at:r.read_at,...r.messages})).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
  const unread = items.filter(item=>!item.read_at).length
  return <AppPageShell title={en?'Updates':'التنبيهات'} eyebrow="AGHAPY · INBOX" description={en?'Announcements and important notes from your team.':'كل الإعلانات والتنبيهات المهمة من فريقك.'} icon="notifications" theme="violet" backLabel={en ? "Back" : "رجوع"}>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#10265a1a] bg-white p-4 shadow-sm"><div><p className="text-xs text-[#52627e]">{en?'Unread':'غير مقروء'}</p><p className="text-2xl font-black">{unread}</p></div><p className="max-w-xs text-sm text-[#52627e]">{unread ? (en?'There are updates waiting for you.':'فيه تنبيهات لسه متقريتش.') : (en?'You are all caught up.':'أنت متابع كل جديد.')}</p></div>
    <MessageList items={items}/>
  </AppPageShell>
}