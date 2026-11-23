import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {getSeniorAdmin} from '@/lib/guard'
import {getLang} from '@/lib/lang'
import ResendButton from '@/components/ResendButton'
import ExcuseReviewActions from '@/components/ExcuseReviewActions'
export const dynamic='force-dynamic'
const fmt=d=>new Date(d).toLocaleString('ar-EG',{timeZone:'Africa/Cairo',dateStyle:'medium',timeStyle:'short'})
const fmtDate=d=>new Date(d+'T12:00:00').toLocaleDateString('ar-EG',{timeZone:'Africa/Cairo',dateStyle:'long'})
const group=(arr,key)=>(arr||[]).reduce((map,item)=>((map[item[key]]||=[]).push(item),map),{})
const statusLabel=(status,en)=>status==='approved'?(en?'Approved':'تمت الموافقة'):status==='rejected'?(en?'Rejected':'مرفوض'):en?'Pending':'قيد المراجعة'
const statusClass=status=>status==='approved'?'bg-emerald-100 text-emerald-800':status==='rejected'?'bg-rose-100 text-rose-800':'bg-amber-100 text-amber-800'
export default async function Page(){
  const en=(await getLang())==='en'
  if(!(await getSeniorAdmin()))redirect('/admin/attendance')
  const db=await createClient()
  const[{data:sessions},{data:excuses}]=await Promise.all([
    db.from('attendance_sessions').select('id,title,location,meeting_date,starts_at,ends_at,status,created_by,created_by_profile:profiles!attendance_sessions_created_by_fkey(full_name)').order('starts_at',{ascending:false}).limit(50),
    db.from('excuses').select('id,user_id,meeting_date,reason,created_at,status,admin_note,reviewed_at,member:profiles!excuses_user_id_fkey(full_name,email)').order('created_at',{ascending:false}).limit(100)
  ])
  const ids=(sessions||[]).map(session=>session.id)
  const[{data:records},{data:reports},{data:logs}]=ids.length?await Promise.all([
    db.from('attendance_records').select('session_id,full_name,status,checked_in_at').in('session_id',ids),
    db.from('reports').select('id,session_id,kind').in('session_id',ids),
    db.from('email_log').select('session_id,status,error,created_at').in('session_id',ids).order('created_at',{ascending:false})
  ]):[{data:[]},{data:[]},{data:[]}]
  const bySession=group(records,'session_id')
  const filesBySession=group(reports,'session_id')
  const logsBySession=group(logs,'session_id')
  return <div className="mx-auto max-w-5xl space-y-6 text-slate-900 dark:text-slate-100">
    <header><p className="text-xs font-black tracking-[.2em] text-indigo-600 dark:text-indigo-300">AGHAPY · ADMIN</p><h1 className="mt-1 text-2xl font-black">{en?'Reports':'التقارير'}</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{en?'Attendance history and member excuse requests.':'سجل الحضور وطلبات الاعتذار المرسلة من الأعضاء.'}</p></header>
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-bold">{en?'Excuse requests':'طلبات الاعتذار'}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{en?'Review incoming requests and update their status.':'راجع الطلبات الواردة وحدّث حالة كل طلب.'}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{(excuses||[]).filter(item=>(item.status||'pending')==='pending').length} {en?'pending':'قيد المراجعة'}</span></div>
      {(excuses||[]).map(excuse=><article key={excuse.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900 dark:text-slate-100">{excuse.member?.full_name|| (en?'Member':'عضو')}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400" dir="ltr">{excuse.member?.email||''}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(excuse.status||'pending')}`}>{statusLabel(excuse.status||'pending',en)}</span></div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300"><span>{en?'Meeting date:':'تاريخ الاجتماع:'} {fmtDate(excuse.meeting_date)}</span><span>{en?'Sent:':'تاريخ الإرسال:'} {fmt(excuse.created_at)}</span></div>
        <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-800 dark:bg-slate-900 dark:text-slate-200">{excuse.reason}</p>
        {excuse.admin_note&&<p className="mt-3 text-sm text-slate-600 dark:text-slate-300"><strong>{en?'Admin note:':'ملاحظة الإدارة:'}</strong> {excuse.admin_note}</p>}
        <ExcuseReviewActions excuse={excuse} lang={en?'en':'ar'}/>
      </article>)}
      {!excuses?.length&&<p className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{en?'No excuse requests have been submitted yet.':'مفيش طلبات اعتذار لسه.'}</p>}
    </section>
    <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
      <div><h2 className="text-xl font-bold">{en?'Attendance reports':'تقارير الحضور'}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{en?'Session attendance records and downloadable reports.':'سجل حضور الاجتماعات والتقارير القابلة للتنزيل.'}</p></div>
      {(sessions||[]).map(session=>{
        const rows=bySession[session.id]||[]
        const files=filesBySession[session.id]||[]
        const last=(logsBySession[session.id]||[])[0]
        const present=rows.filter(row=>row.status==='present')
        const absent=rows.filter(row=>row.status==='absent')
        const emailStatus=!last?(en?'Not sent yet':'لسه ما اتبعتش'):last.status==='sent'?`${en?'Sent':'اتبعت'} ${fmt(last.created_at)}`:`${en?'Failed':'فشل'}: ${last.error||''}`
        return <article key={session.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-bold">{session.title}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{session.location} · {fmt(session.starts_at)} إلى {fmt(session.ends_at)}</p><p className="text-xs text-slate-500 dark:text-slate-400">{en?'Created by:':'أنشأها:'} {session.created_by_profile?.full_name||(en?'Administrator':'أدمن')} · {session.meeting_date}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${session.status==='open'?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>{session.status==='open'?(en?'Open':'مفتوحة'):(en?'Closed':'مقفولة')}</span></div>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{en?'Present':'حضر'} {present.length} · {en?'Absent':'غاب'} {absent.length}</p>
          {session.status==='closed'&&<div className="mt-3 flex flex-wrap items-center gap-2">{['present','absent'].map(kind=>{const file=files.find(item=>item.kind===kind);return file?<a key={kind} href={`/api/admin/reports/download?id=${file.id}`} className="rounded-lg bg-navy px-3 py-2 text-sm font-bold text-white">{en?(kind==='present'?'Download present':'Download absent'):(kind==='present'?'تنزيل الحاضرين':'تنزيل الغايبين')}</a>:null})}{files.length===2&&<ResendButton sessionId={session.id}/>}</div>}
          {session.status==='closed'&&<p className={`mt-2 text-sm ${last?.status==='failed'?'text-rose-600 dark:text-rose-300':'text-slate-600 dark:text-slate-300'}`}>{en?'Email:':'الإيميل:'} {emailStatus}</p>}
          <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-200">{en?'Names':'الأسماء'}</summary><div className="mt-2 grid gap-3 md:grid-cols-2"><div><p className="font-bold text-green-700 dark:text-green-300">{en?'Present':'حاضرين'}</p>{present.map((row,index)=><p key={index} className="text-slate-700 dark:text-slate-300">{row.full_name}</p>)}</div><div><p className="font-bold text-rose-700 dark:text-rose-300">{en?'Absent':'غايبين'}</p>{absent.map((row,index)=><p key={index} className="text-slate-700 dark:text-slate-300">{row.full_name}</p>)}</div></div></details>
        </article>
      })}
      {!sessions?.length&&<p className="rounded-xl bg-white p-6 text-center text-slate-500 dark:bg-slate-800 dark:text-slate-300">{en?'No sessions yet.':'لسه مفيش جلسات.'}</p>}
    </section>
  </div>
}
