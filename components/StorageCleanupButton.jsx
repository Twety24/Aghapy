'use client'
import {useState} from 'react'

export default function StorageCleanupButton(){
  const {lang}=useT();const en=lang==='en';const c=en?{confirm:'Only files that are not linked to a member, photo, meeting, or report will be deleted. Files in use will remain untouched. Continue?',failed:'File cleanup failed.',done:'Unlinked files deleted: ',error:'An error occurred during cleanup.',title:'Clean up unlinked files',description:'Deletes files that are not associated with a photo, member, meeting content, or report, while preserving files in use.',busy:'Cleaning up...',button:'Clean up unlinked files'}:{confirm:'هيتم حذف الملفات غير المرتبطة بأي عضو أو صورة أو اجتماع أو تقرير فقط. الملفات المستخدمة هتفضل زي ما هي. متأكد؟',failed:c.failed,done:c.done,error:c.error,title:'تنظيف الملفات غير المرتبطة',description:'{c.description}',busy:'جاري التنظيف...',button:'تنظيف الملفات غير المرتبطة'};
  const[busy,setBusy]=useState(false)
  const[msg,setMsg]=useState('')
  async function clean(){
    if(!window.confirm(c.confirm))return
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
    <h2 className="font-bold"{c.title}</h2>
    <p className="mt-1 text-sm text-navy/60">يحذف الملفات التي لا ترتبط بأي صورة أو عضو أو محتوى اجتماع أو تقرير، ويحافظ على الملفات المستخدمة.</p>
    <button type="button" className="btn btn-red mt-3" disabled={busy} onClick={clean}>{busy?c.busy:c.button}</button>
    {msg&&<p className="mt-2 text-sm" role="status">{msg}</p>}
  </section>
}
