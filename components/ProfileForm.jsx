'use client'
import {useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabase/client'
const departments=[['acting','تمثيل'],['scenography','سينغرافيا'],['media','ميديا'],['music_prep','إعداد موسيقى'],['other','أخرى']]
export default function ProfileForm({profile,email}){
 const router=useRouter();const[db]=useState(()=>createClient());const[f,setF]=useState({name:profile.full_name||'',phone:profile.phone||'',birth_date:profile.birth_date||'',stage:profile.stage||'',department:profile.department||''});const[photo,setPhoto]=useState(null);const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');const[preview,setPreview]=useState(profile.avatar_url||'')
 async function save(e){
  e.preventDefault();setBusy(true);setMsg('')
  let avatar_url=profile.avatar_url||null
  if(photo){
   const ext=photo.name.split('.').pop()?.toLowerCase()||'jpg'
   const path=profile.id+'/'+Date.now()+'.'+ext
   const up=await db.storage.from('avatars').upload(path,photo,{upsert:false,contentType:photo.type||'image/jpeg',cacheControl:'3600'})
   if(up.error){setBusy(false);setMsg('فشل رفع الصورة. جرّب صورة تانية.');return}
   avatar_url=db.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }
  const{error}=await db.from('profiles').update({full_name:f.name.trim(),phone:f.phone.trim(),birth_date:f.birth_date||null,stage:f.stage,department:f.department,avatar_url}).eq('id',profile.id)
  if(error){if(photo&&avatar_url){const path=avatar_url.split('/avatars/')[1];if(path)await db.storage.from('avatars').remove([decodeURIComponent(path)])}setBusy(false);setMsg('ماقدرناش نحفظ البيانات. جرّب تاني.');return}
  setBusy(false);setMsg('تم حفظ بياناتك وصورتك.');router.refresh()
 }
 return <main className="mx-auto min-h-dvh max-w-md bg-white px-5 py-6"><Link href="/dashboard" className="text-sm underline">رجوع</Link><h1 className="mt-4 text-2xl font-bold">بياناتي</h1><p className="mt-2 text-sm text-navy/60" dir="ltr">{email}</p><form onSubmit={save} className="mt-5 space-y-4"><div className="text-center"><img src={preview||'/logo.jpg'} alt="الصورة الشخصية" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/logo.jpg'}} className="mx-auto h-28 w-28 rounded-full border-4 border-white bg-white object-cover shadow-md"/><label className="btn btn-navy mt-3 cursor-pointer">تغيير الصورة<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{const file=e.target.files?.[0]||null;setPhoto(file);if(file)setPreview(URL.createObjectURL(file))}}/></label></div><div><label className="label">الاسم بالكامل</label><input className="input" required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></div><div><label className="label">رقم التليفون</label><input className="input" dir="ltr" type="tel" required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></div><div><label className="label">تاريخ الميلاد</label><input className="input" type="date" max={new Date().toISOString().slice(0,10)} value={f.birth_date} onChange={e=>setF({...f,birth_date:e.target.value})}/><p className="mt-1 text-xs text-navy/50">تاريخ الميلاد اللي سجلته وقت إنشاء الحساب.</p></div><div><label className="label">المرحلة</label><select className="input" value={f.stage} onChange={e=>setF({...f,stage:e.target.value})}><option value="">اختار</option><option value="prep">إعدادي</option><option value="secondary">ثانوي</option><option value="university">جامعة</option><option value="graduated">خريج</option></select></div><div><label className="label">القسم</label><select className="input" value={f.department} onChange={e=>setF({...f,department:e.target.value})}><option value="">اختار</option>{departments.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>{msg&&<p className="text-sm" role="status">{msg}</p>}<button className="btn btn-red" disabled={busy}>{busy?'جاري الحفظ...':'حفظ'}</button></form></main>
}
