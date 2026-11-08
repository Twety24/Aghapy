'use client'
import {useState} from 'react'
import Link from 'next/link'
import {createClient} from '@/lib/supabase/client'
function saturday(){const d=new Date();const n=(6-d.getDay()+7)%7||7;d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA')}
export default function ExcusePage(){
 const[reason,setReason]=useState('');const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('')
 async function submit(e){e.preventDefault();if(reason.trim().length<3)return setMsg('اكتب سبب الغياب بشكل أوضح.');setBusy(true);const db=createClient();const{data:{user}}=await db.auth.getUser();const{error}=await db.from('excuses').upsert({user_id:user.id,meeting_date:saturday(),reason:reason.trim()},{onConflict:'user_id,meeting_date'});setBusy(false);setMsg(error?'ماقدرناش نبعت العذر. جرّب تاني.':'تم إرسال العذر.');}
 return <main className="mx-auto min-h-dvh max-w-md bg-white px-5 py-6"><Link href="/dashboard" className="text-sm underline">رجوع</Link><h1 className="mt-4 text-2xl font-bold">تقديم عذر</h1><p className="mt-2 text-sm text-navy/70">لو مش هتقدر تحضر اجتماع السبت، اكتب السبب هنا.</p><form onSubmit={submit} className="mt-5 space-y-4"><textarea className="input min-h-36" value={reason} onChange={e=>setReason(e.target.value)} placeholder="اكتب سبب الغياب" required maxLength={1000}/>{msg&&<p className="text-sm">{msg}</p>}<button className="btn btn-red" disabled={busy}>{busy?'جاري الإرسال...':'إرسال العذر'}</button></form></main>
}
