'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { arabicError } from '@/lib/errors'
import AuthShell from '@/components/AuthShell'
import { useT } from '@/components/LangProvider'
import Toggles from '@/components/Toggles'

export default function LoginPage() {
 const router=useRouter();const{t}=useT()
 const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false)
 async function submit(e){e.preventDefault();setBusy(true);setError('');const supabase=createClient();const{data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error){setError(arabicError(error.message));setBusy(false);return}const{data:p}=await supabase.from('profiles').select('is_active').eq('id',data.user.id).single();if(p&&!p.is_active){await supabase.auth.signOut();setError('Account suspended. Contact the administrator.');setBusy(false);return}router.replace('/dashboard');router.refresh()}
 return <AuthShell title={t('login.title')} subtitle={t('login.sub')}><div className="mb-4 flex justify-end"><Toggles/></div><form onSubmit={submit} className="space-y-4"><div><label className="label" htmlFor="email">{t('login.email')}</label><input id="email" type="email" required dir="ltr" className="input" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></div><div><label className="label" htmlFor="password">{t('login.password')}</label><input id="password" type="password" required dir="ltr" className="input" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></div>{error&&<p className="alert-error" role="alert">{error}</p>}<button className="btn btn-red" disabled={busy}>{busy?'...':t('login.submit')}</button><div className="flex justify-between text-sm"><Link href="/forgot-password" className="underline">{t('login.forgot')}</Link><Link href="/register" className="font-bold underline">{t('login.register')}</Link></div></form></AuthShell>
}
