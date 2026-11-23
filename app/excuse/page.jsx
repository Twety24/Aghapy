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
  const[success,setSuccess]=useState(false)
  async function submit(e){
    e.preventDefault()
    if(!date){setMsg(en?'Choose the meeting date.':'اختار تاريخ الاجتماع.');return}
    if(reason.trim().length<3){setMsg(t('exc.short'));return}
    setBusy(true)
    setMsg('')
    setSuccess(false)
    try{
      const db=createClient()
      const{data:{user},error:authError}=await db.auth.getUser()
      if(authError||!user){
        setMsg(en?'Your session expired. Sign in again.':'انتهت جلسة الدخول. سجّل دخولك مرة تانية.')
        setBusy(false)
        return
      }
      const{error}=await db.from('excuses').insert({user_id:user.id,meeting_date:date,reason:reason.trim()})
      if(error){
        if(error.code==='23505'){
          setMsg(en?'You already submitted an excuse for this meeting date.':'أنت بعت اعتذار قبل كده لنفس تاريخ الاجتماع.')
        }else{
          console.error('Excuse submission failed:',error)
          setMsg(en?'We could not send your excuse. Please try again.':'حصلت مشكلة أثناء إرسال الاعتذار. حاول تاني.')
        }
        setBusy(false)
        return
      }
      setSuccess(true)
      setMsg(en?'Your excuse was sent to the administration.':'تم إرسال اعتذارك للإدارة بنجاح.')
      setReason('')
    }catch(error){
      console.error('Excuse submission failed:',error)
      setMsg(en?'An unexpected error occurred. Please try again.':'حصل خطأ غير متوقع. حاول تاني.')
    }
    setBusy(false)
  }
  return <AppPageShell title={t('exc.title')} eyebrow="AGHAPY · ATTENDANCE" description={en?'Send a note to the team if you cannot make a meeting.':'لو مش هتقدر تحضر اجتماع، ابعت توضيح للفريق.'} icon="excuse" theme="rose" backLabel={en?"Back":"رجوع"}>
    <form onSubmit={submit} className="space-y-4 rounded-[1.5rem] border border-[#f0e4e9] bg-white p-5 shadow-sm">
      <div><label className="label">{en?'Meeting date':'تاريخ الاجتماع'}</label><input className="input" type="date" required value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div><label className="label">{en?'Reason':'سبب الاعتذار'}</label><textarea className="input min-h-36 resize-y" value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('exc.placeholder')} required minLength={3} maxLength={1000}/><p className="mt-1 text-xs text-[#8994a9]">{reason.length}/1000</p></div>
      {msg&&<p className={`rounded-xl p-3 text-sm ${success?'bg-emerald-50 text-emerald-800':'bg-[#f8f2f4] text-[#8a4560]'}`} role="status">{msg}</p>}
      <button type="submit" className="btn btn-red" disabled={busy}>{busy?(en?'Sending...':'جاري الإرسال...'):t('exc.submit')}</button>
    </form>
  </AppPageShell>
}
