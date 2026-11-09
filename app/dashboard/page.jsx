import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {getLang} from '@/lib/lang'
import {tFor} from '@/lib/i18n'
import Toggles from '@/components/Toggles'
import HomeMenu from '@/components/HomeMenu'
import AvatarImage from '@/components/AvatarImage'
import NotificationCenter from '@/components/NotificationCenter'
import NotificationPermissionPrompt from '@/components/NotificationPermissionPrompt'
import FeatureIcon from '@/components/FeatureIcon'
export const dynamic='force-dynamic'
async function signOut(){'use server';await(await createClient()).auth.signOut();redirect('/login')}
export default async function Dashboard(){
 const t=tFor(await getLang())
 const db=await createClient()
 const{data:{user}}=await db.auth.getUser()
 if(!user)redirect('/login')
 const[{data:profile},{data:notifications},{data:saves},{data:notificationPreference}]=await Promise.all([
  db.from('profiles').select('full_name,role,is_active,avatar_url').eq('id',user.id).single(),
  db.from('notifications').select('id,notification_type,title,body,href,created_at,read_at,daily_verse_id,daily_verses(reference,verse_text)').eq('user_id',user.id).is('dismissed_at',null).order('created_at',{ascending:false}).limit(8),
  db.from('daily_verse_saves').select('verse_id').eq('user_id',user.id),
  db.from('notification_preferences').select('device_notifications_enabled').eq('user_id',user.id).maybeSingle()
 ])
 if(profile&&!profile.is_active)return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center"><p className="alert-error">Account suspended. Contact the administrator.</p><form action={signOut}><button className="btn btn-navy">{t('common.logout')}</button></form></main>
 const first=(profile?.full_name||'').split(' ')[0]
 const cards=[['/messages','nav.messages','messages'],['/photos','nav.photos','photos'],['/meeting','nav.meeting','meeting'],['/excuse','nav.excuse','excuse'],['/suggestions','nav.suggestions','suggestions'],['/chats','nav.chats','chats']]
 const menu=[['/scan','home.scan'],...cards.map(([href,key])=>[href,key]),['/profile','nav.profile'],...(profile?.role==='admin'?[['/admin','nav.admin']]:[])]
 return <div className="min-h-[calc(100dvh-3.25rem)] bg-ice">
  <header className="bg-navy px-4 pb-20 pt-3 text-white"><div className="mx-auto flex max-w-md items-center justify-between"><HomeMenu links={menu} signOut={signOut}/><div className="flex items-center gap-3"><Toggles className="text-sky"/><span className="h-8 w-px bg-white/20"/></div></div></header>
  <main className="mx-auto -mt-16 max-w-md space-y-3 px-4 pb-4">
   <section className="text-center"><AvatarImage src={profile?.avatar_url} alt="الصورة الشخصية" className="mx-auto h-20 w-20 rounded-full border-4 border-white bg-white object-cover shadow-md"/><h1 className="mt-2 text-xl font-bold">{t('home.hi',{name:first})}</h1><p className="mt-1 text-sm text-navy/70">تُعَرِّفُنِي سَبِيلَ الْحَيَاةِ. (مزمور 16:11)</p><p className="text-sm font-bold">{t('home.welcome')}</p></section>
   <Link href="/scan" className="group flex items-center gap-3 rounded-2xl bg-stage p-4 text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[.99]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><FeatureIcon name="scan" className="h-6 w-6"/></span><span><span className="block font-bold">{t('home.scan')}</span><span className="text-xs opacity-90">{t('home.scanSub')}</span></span><span className="ms-auto text-xl transition-transform group-hover:-translate-x-1">←</span></Link>
   {profile?.role==='member'&&<NotificationPermissionPrompt userId={user.id} initialChoice={notificationPreference?notificationPreference.device_notifications_enabled:null}/>}
   <NotificationCenter items={notifications||[]} savedVerseIds={(saves||[]).map(x=>x.verse_id)} userId={user.id}/>
   <div className="grid grid-cols-2 gap-3">{cards.map(([href,key,icon])=><Link key={href} href={href} className="feature-card flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-center font-bold text-navy shadow-sm ring-1 ring-navy/10 transition duration-300 hover:-translate-y-1 hover:shadow-md active:scale-[.98]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-ice text-navy"><FeatureIcon name={icon} className="h-6 w-6"/></span><span className="text-sm">{t(key)}</span></Link>)}</div>
   {profile?.role==='admin'&&<Link href="/admin" className="block rounded-xl bg-navy p-3 text-center text-sm font-bold text-white transition hover:bg-[#0c1d45]">{t('nav.admin')}</Link>}
  </main>
 </div>
}