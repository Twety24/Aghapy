'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabase/client'
export default function ExcuseReviewActions({excuse,lang='ar'}){
  const en=lang==='en'
  const router=useRouter()
  const[status,setStatus]=useState(excuse.status||'pending')
  const[note,setNote]=useState(excuse.admin_note||'')
  const[busy,setBusy]=useState(false)
  const[message,setMessage]=useState('')
  async function update(nextStatus){
    setBusy(true)
    setMessage('')
    const db=createClient()
    const{data:{user},error:authError}=await db.auth.getUser()
    if(authError||!user){
      setMessage(en?'Session expired. Sign in again.':'انتهت الجلسة. سجّل الدخول مرة تانية.')
      setBusy(false)
      return
    }
    const{error}=await db.from('excuses').update({
      status:nextStatus,
      admin_note:note.trim()||null,
      reviewed_by:user.id,
      reviewed_at:new Date().toISOString()
    }).eq('id',excuse.id).select('id').single()
    if(error){
      console.error('Excuse review failed:',error)
      setMessage(en?'Could not save the review. Check your admin access and try again.':'ماقدرناش نحفظ المراجعة. اتأكد من صلاحيات الأدمن وحاول تاني.')
      setBusy(false)
      return
    }
    setStatus(nextStatus)
    setMessage(en?'Saved.':'تم الحفظ.')
    setBusy(false)
    router.refresh()
  }
  return <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{en?'Admin note (optional)':'ملاحظة الإدارة (اختياري)'}</label>
    <textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={2} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" placeholder={en?'Add a short note for the member...':'اكتب ملاحظة قصيرة للعضو...'}/>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={()=>update('approved')} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50">{en?'Approve':'موافقة'}</button>
      <button type="button" disabled={busy} onClick={()=>update('rejected')} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-800 disabled:opacity-50">{en?'Reject':'رفض'}</button>
      <button type="button" disabled={busy} onClick={()=>update('pending')} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">{en?'Mark pending':'إرجاع للمراجعة'}</button>
    </div>
    {message&&<p role="status" className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
  </div>
}
