import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {getLang} from '@/lib/lang'
import AppPageShell from '@/components/AppPageShell'
export const dynamic='force-dynamic'
export default async function ChatsPage(){
  const en=(await getLang())==='en'
  const db=await createClient()
  const{data:{user}}=await db.auth.getUser()
  if(!user)redirect('/login')
  const{data:groups}=await db.from('groups').select('id,name').order('name')
  return <AppPageShell title={en?'Group chats':'مجموعات الشات'} eyebrow="AGHAPY · COMMUNITY" description={en?'Pick a group and catch up with everyone.':'ادخل مجموعتك وتابع الكلام مع باقي الأعضاء.'} icon="chats" theme="teal" backLabel={en ? "Back" : "رجوع"}>
    <div className="grid gap-3 sm:grid-cols-2">
      {(groups||[]).map(g=><Link href={`/chats/${g.id}`} key={g.id} className="group flex items-center gap-4 rounded-[1.5rem] border border-[#e5edf0] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e7f1f0] text-xl font-black text-[#28636a]">{g.name?.trim()?.[0]||'#'}</span><span className="min-w-0 flex-1"><span className="block font-black">{g.name}</span><span className="mt-1 block text-xs text-[#8994a9]">{en?'Open conversation':'افتح المحادثة'}</span></span><span className="text-xl text-[#6b999b] transition-transform group-hover:-translate-x-1">←</span></Link>)}
    </div>
    {!groups?.length&&<p className="rounded-2xl border border-[#e5edf0] bg-white p-6 text-center text-sm text-[#71809a]">{en?'No groups are available yet.':'لسه مفيش مجموعات متاحة.'}</p>}
  </AppPageShell>
}