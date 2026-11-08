'use client'
import {useState} from 'react'
import Link from 'next/link'
import {createClient} from '@/lib/supabase/client'
import {useT} from '@/components/LangProvider'
function saturday(){const d=new Date();const n=(6-d.getDay()+7)%7||7;d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA')}
export default function ExcusePage(){
 const{t}=useT();const[reason,setReason]=useState('');const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('')
 async function submit(e){e.preventDefault();if(reason.trim().length<3)return setMsg(t('exc.short'));setBusy(true);const db=createClient();const{data:{user}}=await db.auth.getUser();const{error}=await db.from('excuses').upsert({user_id:user.id,meeting_date:saturday(),reason:reason.trim()},{onConflict:'user_id,meeting_date'});setBusy(false);setMsg(error?t('common.error'):t('exc.ok'))}
 return <main className="mx-auto min-h-dvh max-w-md bg-white px-5 py-6"><Link href="/dashboard" className="text-sm underline">{t('common.back')}</Link><h1 className="mt-4 text-2xl font-bold">{t('exc.title')}</h1><p className="mt-2 text-sm text-navy/70">{t('exc.sub')}</p><form onSubmit={submit} className="mt-5 space-y-4"><textarea className="input min-h-36" value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('exc.placeholder')} required maxLength={1000}/>{msg&&<p className="text-sm">{msg}</p>}<button className="btn btn-red" disabled={busy}>{busy?'...':t('exc.submit')}</button></form></main>
}
