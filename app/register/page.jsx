'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { arabicError } from '@/lib/errors'
import AuthShell from '@/components/AuthShell'
import { useT } from '@/components/LangProvider'

const STAGES=['prep','secondary','university','graduated']
const DEPARTMENTS=['acting','scenography','media','music_prep','other']
const PHOTO_TYPES=['image/jpeg','image/png','image/webp']
export default function RegisterPage(){
 const router=useRouter();const{t}=useT();const[f,setF]=useState({name:'',phone:'',address:'',email:'',birth_date:'',stage:'',department:'',password:'',confirm:''});const[photo,setPhoto]=useState(null);const[preview,setPreview]=useState('');const[error,setError]=useState('');const[info,setInfo]=useState('');const[busy,setBusy]=useState(false)
 const set=k=>e=>setF({...f,[k]:e.target.value})
 function choosePhoto(e){const file=e.target.files?.[0]||null;setPhoto(file);if(preview)URL.revokeObjectURL(preview);setPreview(file?URL.createObjectURL(file):'')}
 async function submit(e){
  e.preventDefault();setError('');setInfo('')
  const phone=f.phone.trim()
  if(f.name.trim().length<3)return setError(t('error.name'))
  if(f.address.trim().length<5)return setError('اكتب عنوانك بالتفصيل.')
  if(!/^\+?[0-9٠-٩]{8,15}$/.test(phone.replace(/[\s()-]/g,'')))return setError(t('error.phone'))
  if(!f.birth_date)return setError('اختار تاريخ ميلادك.')
  const birthDate=new Date(f.birth_date+'T00:00:00');const today=new Date();let age=today.getFullYear()-birthDate.getFullYear();if(today<new Date(today.getFullYear(),birthDate.getMonth(),birthDate.getDate()))age--
  if(!Number.isFinite(age)||age<5||age>99)return setError('تاريخ الميلاد لازم يكون صحيح والسن بين 5 و99 سنة.')
  if(!f.stage||!f.department)return setError(t('error.stage'))
  if(f.password.length<8)return setError(t('error.password'))
  if(f.password!==f.confirm)return setError(t('error.match'))
  if(photo&&!PHOTO_TYPES.includes(photo.type))return setError(t('register.photoType'))
  if(photo&&photo.size>5*1024*1024)return setError(t('register.photoSize'))
  setBusy(true)
  const db=createClient()
  const{data,error}=await db.auth.signUp({email:f.email.trim(),password:f.password,options:{data:{full_name:f.name.trim(),phone,address:f.address.trim(),birth_date:f.birth_date,stage:f.stage,department:f.department},emailRedirectTo:`${location.origin}/auth/callback`}})
  if(error){setError(arabicError(error.message));setBusy(false);return}
  if(data.session){
   if(photo){
    const ext=photo.type==='image/png'?'png':photo.type==='image/webp'?'webp':'jpg'
    const path=data.user.id+'/'+Date.now()+'.'+ext
    const up=await db.storage.from('avatars').upload(path,photo,{upsert:false,contentType:photo.type,cacheControl:'3600'})
    if(!up.error){
     const avatarUrl=db.storage.from('avatars').getPublicUrl(path).data.publicUrl
     const saved=await db.from('profiles').update({avatar_url:avatarUrl}).eq('id',data.user.id)
     if(saved.error){await db.storage.from('avatars').remove([path]);setInfo(t('register.photoLater'))}
    }else setInfo(t('register.photoLater'))
   }
   router.replace('/dashboard');router.refresh();return
  }
  setInfo(photo?t('register.confirmPhotoLater'):t('register.confirmInfo'))
  setBusy(false)
 }
 return <AuthShell title={t('register.title')} subtitle={t('register.sub')}><form onSubmit={submit} className="space-y-4"><div><label className="label" htmlFor="name">{t('register.name')}</label><input id="name" required className="input" value={f.name} onChange={set('name')} autoComplete="name"/></div><div><label className="label" htmlFor="photo">{t('register.photo')}</label><div className="flex items-center gap-4"><img src={preview||'/logo.jpg'} alt={t('register.photoPreview')} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/logo.jpg'}} className="h-20 w-20 rounded-full border bg-white object-cover"/><div className="min-w-0 flex-1"><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="input text-sm" onChange={choosePhoto}/><p className="mt-1 text-xs text-navy/60">{t('register.photoHint')}</p></div></div></div><div><label className="label" htmlFor="phone">{t('register.phone')}</label><input id="phone" type="tel" required dir="ltr" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="+20 1xxxxxxxxx"/></div><div><label className="label" htmlFor="address">العنوان <span className="text-red-600">*</span></label><textarea id="address" required minLength={5} maxLength={300} className="input min-h-20" value={f.address} onChange={set('address')} placeholder="اكتب عنوانك بالتفصيل"/></div><div><label className="label" htmlFor="birth_date">تاريخ الميلاد</label><input id="birth_date" type="date" required max={new Date().toISOString().slice(0,10)} className="input" value={f.birth_date} onChange={set('birth_date')}/></div><div><label className="label" htmlFor="stage">{t('register.stage')}</label><select id="stage" required className="input" value={f.stage} onChange={set('stage')}><option value="">{t('register.choose')}</option>{STAGES.map(s=><option key={s} value={s}>{t('stage.'+s)}</option>)}</select></div><div><label className="label" htmlFor="department">{t('register.department')}</label><select id="department" required className="input" value={f.department} onChange={set('department')}><option value="">{t('register.choose')}</option>{DEPARTMENTS.map(s=><option key={s} value={s}>{t('department.'+s)}</option>)}</select></div><div><label className="label" htmlFor="email">{t('register.email')}</label><input id="email" type="email" required dir="ltr" className="input" value={f.email} onChange={set('email')} autoComplete="email"/></div><div><label className="label" htmlFor="password">{t('register.password')}</label><input id="password" type="password" required dir="ltr" className="input" value={f.password} onChange={set('password')} autoComplete="new-password"/></div><div><label className="label" htmlFor="confirm">{t('register.confirm')}</label><input id="confirm" type="password" required dir="ltr" className="input" value={f.confirm} onChange={set('confirm')} autoComplete="new-password"/></div>{error&&<p className="alert-error" role="alert">{error}</p>}{info&&<p className="alert-ok" role="status">{info}</p>}<button className="btn btn-red" disabled={busy}>{busy?t('register.busy'):t('register.submit')}</button><p className="text-center text-sm">{t('register.have')} <Link href="/login" className="font-bold underline">{t('register.login')}</Link></p></form></AuthShell>
}
