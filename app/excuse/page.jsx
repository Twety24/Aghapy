'use client'
import {useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {useT} from '@/components/LangProvider'
import AppPageShell from '@/components/AppPageShell'
const today=()=>{const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,10)}
export default function ExcusePage(){
  const{t,lang}=useT()
  const en=lang==='en'
  const[date,setDate]=useState(today())
  const[reason,setReason]=useState('')
  const[busy,setBusy]=useState(false)
  const[msg,setMsg]=useState('')
  async function submit(e){
    e.preventDefault()
    if(!date)return setMsg(en?'Choose the meeting date.':'اختار تاريخ الاجتماع.')
    if(reason.trim().length<3)return setMsg(t('exc.short'))
    setBusy(true)
    const db=createClient()
    const{data:{user}}=await db.auth.getUser()
    const{error}=await db.from('excuses').upsert({user_id:user.id,meeting_date:date,reason:reason.trim()},{onConflict:'user_id,meeting_date'})
    setBusy(false)
    setMsg(error?t('common.error'):t('exc.ok'))
  }
  return <AppPageShell title={t('exc.title')} eyebrow="AGHAPY · ATTENDANCE" description={en?'Send a note to the team if you cannot make a meeting.':'لو مش هتقدر تحضر اجتماع، ابعت توضيح للفريق.'} icon="excuse" theme="rose" backLabel={en ? "Back" : "رجوع"}>
    <form onSubmit={submit} className="space-y-4 rounded-[1.5rem] border border-[#f0e4e9] bg-white p-5 shadow-sm">
      <div><label className="label">{en?'Meeting date':'تاريخ الاجتماع'}</label><input className="input" type="date" required value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div><label className="label">{en?'Reason':'سبب الاعتذار'}</label><textarea className="input min-h-36 resize-y" value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('exc.placeholder')} required maxLength={1000}/><p className="mt-1 text-xs text-[#8994a9]">{reason.length}/1000</p></div>
      {msg&&<p className="rounded-xl bg-[#f8f2f4] p-3 text-sm text-[#8a4560]" role="status">{msg}</p>}
      <button className="btn btn-red" disabled={busy}>{busy?(en?'Sending...':'جاري الإرسال...'):t('exc.submit')}</button>
    </form>
  </AppPageShell>
}