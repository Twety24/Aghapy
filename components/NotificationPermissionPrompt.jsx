'use client'
import {useEffect,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
export default function NotificationPermissionPrompt({userId,initialChoice}){
 const[choice,setChoice]=useState(initialChoice)
 const[permission,setPermission]=useState('default')
 const[busy,setBusy]=useState(false)
 const[message,setMessage]=useState('')
 useEffect(()=>{if('Notification'in window)setPermission(Notification.permission)},[])
 async function saveChoice(enabled){
  setBusy(true);setMessage('')
  const db=createClient()
  const{error}=await db.from('notification_preferences').upsert({user_id:userId,device_notifications_enabled:enabled,choice_made_at:new Date().toISOString(),updated_at:new Date().toISOString()})
  if(error){setMessage('حصلت مشكلة في حفظ اختيارك. حاول مرة تانية.');setBusy(false);return}
  setChoice(enabled)
  if(enabled){
   if(!('Notification'in window)){setMessage('المتصفح ده مش بيدعم إشعارات الجهاز. هتفضل الإشعارات جوه التطبيق.');setBusy(false);return}
   if(Notification.permission==='denied'){setPermission('denied');setMessage('إشعارات الموقع مقفولة من إعدادات المتصفح. تقدر تفعّلها من إعدادات الموقع.');setBusy(false);return}
   const result=await Notification.requestPermission()
   setPermission(result)
   if(result!=='granted'){
    await db.from('notification_preferences').update({device_notifications_enabled:false,updated_at:new Date().toISOString()}).eq('user_id',userId)
    setChoice(false)
    setMessage(result==='denied'?'تم رفض الإشعارات. هتفضل توصلك داخل التطبيق فقط.':'لم يتم منح إذن الإشعارات. هتفضل داخل التطبيق فقط.')
   }
  }
  setBusy(false)
 }
 if(choice!==null)return null
 return <div className="fixed inset-0 z-[100] grid place-items-center bg-navy/55 p-5 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="notification-permission-title" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center text-navy shadow-2xl"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ice text-2xl">♧</div><h2 id="notification-permission-title" className="text-xl font-bold">تحب توصلك إشعارات Aghapy على الموبايل؟</h2><p className="mt-3 text-sm leading-7 text-navy/70">لو وافقت، هنطلب إذن المتصفح عشان توصلك التنبيهات على الجهاز. لو رفضت، هتفضل تشوف كل الإشعارات جوه التطبيق عادي.</p>{message&&<p className="mt-3 rounded-xl bg-ice p-3 text-xs leading-6">{message}</p>}<div className="mt-5 grid grid-cols-2 gap-3"><button disabled={busy} onClick={()=>saveChoice(false)} className="rounded-xl border border-navy/15 px-4 py-3 text-sm font-bold transition hover:bg-ice disabled:opacity-50">مش دلوقتي</button><button disabled={busy} onClick={()=>saveChoice(true)} className="rounded-xl bg-stage px-4 py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50">{busy?'لحظة...':'السماح'}</button></div></section></div>
}