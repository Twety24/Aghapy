'use client'
import {useState} from 'react'

export default function StorageCleanupButton(){
  const[busy,setBusy]=useState(false)
  const[msg,setMsg]=useState('')
  async function clean(){
    if(!window.confirm('هيتم حذف الملفات غير المرتبطة بأي عضو أو صورة أو اجتماع أو تقرير فقط. الملفات المستخدمة هتفضل زي ما هي. متأكد؟'))return
    setBusy(true)
    setMsg('')
    try{
      const res=await fetch('/api/admin/storage-cleanup',{method:'POST'})
      const data=await res.json()
      if(!res.ok)throw new Error(data.message||'فشل تنظيف الملفات.')
      setMsg('تم حذف الملفات غير المرتبطة: '+Object.entries(data.removed).map(([k,v])=>k+': '+v).join('، '))
    }catch(e){
      setMsg(e.message||'حصل خطأ أثناء التنظيف.')
    }
    setBusy(false)
  }
  return <section className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
    <h2 className="font-bold">تنظيف الملفات غير المرتبطة</h2>
    <p className="mt-1 text-sm text-navy/60">يحذف الملفات التي لا ترتبط بأي صورة أو عضو أو محتوى اجتماع أو تقرير، ويحافظ على الملفات المستخدمة.</p>
    <button type="button" className="btn btn-red mt-3" disabled={busy} onClick={clean}>{busy?'جاري التنظيف...':'تنظيف الملفات غير المرتبطة'}</button>
    {msg&&<p className="mt-2 text-sm" role="status">{msg}</p>}
  </section>
}
