import {createClient} from '@/lib/supabase/server'
import {getLang} from '@/lib/lang'
import AppPageShell from '@/components/AppPageShell'
export const dynamic='force-dynamic'
export default async function MeetingPage(){
  const en=(await getLang())==='en'
  const db=await createClient()
  const{data:m}=await db.from('meeting_content').select('*').eq('id',1).maybeSingle()
  const img=m?.image_path?db.storage.from('meeting').getPublicUrl(m.image_path).data.publicUrl:null
  const has=m&&(m.hymns?.trim()||m.word_title?.trim()||m.word_summary?.trim()||img)
  return <AppPageShell title={en?'This week’s meeting':'اجتماع الأسبوع'} eyebrow="AGHAPY · MEETING" description={en?'The word, hymns and details prepared for the next gathering.':'الكلمة والترانيم وتفاصيل الاجتماع في مكان واحد.'} icon="meeting" theme="gold">
    {!has&&<p className="rounded-2xl border border-[#e8ecf3] bg-white p-6 text-center text-[#71809a]">{en?'No meeting content has been added yet.':'لسه مفيش محتوى للاجتماع.'}</p>}
    {img&&<img src={img} alt="" className="w-full rounded-[1.5rem] object-cover shadow-sm"/>}
    {m?.word_title?.trim()&&<section className="rounded-[1.5rem] border border-[#e8ecf3] bg-white p-5 shadow-sm"><p className="text-xs font-black tracking-widest text-[#a17b43]">{en?'THE WORD':'كلمة الاجتماع'}</p><h2 className="mt-2 text-xl font-black">{m.word_title}</h2>{m.word_summary?.trim()&&<p className="mt-3 whitespace-pre-wrap leading-8 text-[#586780]">{m.word_summary}</p>}</section>}
    {m?.hymns?.trim()&&<section className="rounded-[1.5rem] border border-[#e8ecf3] bg-white p-5 shadow-sm"><p className="text-xs font-black tracking-widest text-[#a17b43]">{en?'HYMNS':'الترانيم'}</p><p className="mt-3 whitespace-pre-wrap leading-8">{m.hymns}</p></section>}
  </AppPageShell>
}