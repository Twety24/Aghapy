import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {getLang} from '@/lib/lang'
export const dynamic='force-dynamic'
export default async function ChatsPage(){const lang=await getLang();const en=lang==='en';const db=await createClient();const{data:{user}}=await db.auth.getUser();if(!user)redirect('/login');const{data:groups}=await db.from('groups').select('id,name').order('name');return <main className="mx-auto min-h-dvh max-w-md bg-white px-5 py-6"><Link href="/dashboard" className="text-sm underline">{en?'Back':'رجوع'}</Link><h1 className="mt-4 text-2xl font-bold">{en?'Group chats':'مجموعات الشات'}</h1><ul className="mt-5 space-y-3">{(groups||[]).map(g=><li key={g.id}><Link href={`/chats/${g.id}`} className="block rounded-2xl bg-ice p-5 font-bold">{g.name}</Link></li>)}</ul>{!groups?.length&&<p className="mt-5 rounded-xl bg-ice p-5 text-center">{en?'No groups are available yet.':'لسه مفيش مجموعات.'}</p>}</main>}
