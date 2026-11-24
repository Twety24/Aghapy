'use client'
import {useEffect,useState} from 'react'
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
  const[requests,setRequests]=useState([])
  async function loadRequests(){
    const db=createClient()
    const{data:{user}}=await db.auth.getUser()
    if(!user)return
    const{data,error}=await db.from('excuses').select('id,meeting_date,reason,status,admin_note,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10)
    if(!error)setRequests(data||[])
  }
  useEffect(()=>{loadRequests()},[])
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
      await loadRequests()
    }catch(error){
      console.error('Excuse submission failed:',error)
      setMsg(en?'An unexpected error occurred. Please try again.':'حصل خطأ غير متوقع. حاول تاني.')
    }
    setBusy(false)
  }
  const statusText=status=>status==='approved'?(en?'Approved':'تمت الموافقة'):status==='rejected'?(en?'Rejected':'مرفوض'):en?'Pending review':'قيد المراجعة'
  const statusStyle=status=>status==='approved'?'bg-emerald-100 text-emerald-800':status==='rejected'?'bg-rose-100 text-rose-800':'bg-amber-100 text-amber-800'
  return <AppPageShell title={t('exc.title')} eyebrow="AGHAPY · ATTENDANCE" description={en?'Send a note to the team if you cannot make a meeting.':'لو مش هتقدر تحضر اجتماع، ابعت توضيح للفريق.'} icon="excuse" theme="rose" backLabel={en?"Back":"رجوع"}>
    <form onSubmit={submit} className="space-y-4 rounded-[1.5rem] border border-[#10265a1a] bg-white p-5 shadow-sm">
      <div><label className="label">{en?'Meeting date':'تاريخ الاجتماع'}</label><input className="input" type="date" required value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div><label className="label">{en?'Reason':'سبب الاعتذار'}</label><textarea className="input min-h-36 resize-y" value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('exc.placeholder')} required minLength={3} maxLength={1000}/><p className="mt-1 text-xs text-[#71809a]">{reason.length}/1000</p></div>
      {msg&&<p className={`rounded-xl p-3 text-sm ${success?'bg-emerald-50 text-emerald-800':'bg-[#fce8ea] text-[#d92d3a]'}`} role="status">{msg}</p>}
      <button type="submit" className="btn btn-red" disabled={busy}>{busy?(en?'Sending...':'جاري الإرسال...'):t('exc.submit')}</button>
    </form>
    <section className="space-y-3">
      <div><h2 className="text-lg font-bold text-slate-900">{en?'My excuse requests':'طلباتي السابقة'}</h2><p className="mt-1 text-sm text-slate-600">{en?'You can follow the status of each request here.':'تقدر تتابع حالة كل اعتذار من هنا.'}</p></div>
      {requests.map(item=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-slate-900">{en?'Meeting date:':'تاريخ الاجتماع:'} {item.meeting_date}</p><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(item.status||'pending')}`}>{statusText(item.status||'pending')}</span></div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.reason}</p>
        {item.admin_note&&<p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><strong>{en?'Administration:':'رد الإدارة:'}</strong> {item.admin_note}</p>}
      </article>)}
      {!requests.length&&<p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">{en?'Your submitted requests will appear here.':'الاعتذارات اللي بتبعتها هتظهر هنا.'}</p>}
    </section>
  </AppPageShell>
}
