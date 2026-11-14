import {createAdminClient} from '@/lib/supabase/admin'
import {presentBuffer,absentBuffer} from '@/lib/reports'
import {sendReportEmail} from '@/lib/mail'

const MAX_ATTEMPTS=3
const RETRY_AFTER_MS=3*60*1000
const XLSX='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

async function notifyAdmins(db,title,body){
  const{data:admins,error:adminsError}=await db.from('profiles').select('id').eq('role','admin').eq('is_active',true)
  if(adminsError)throw adminsError
  if(!admins?.length)return
  const{data:m,error:messageError}=await db.from('messages').insert({title,body}).select('id').single()
  if(messageError)throw messageError
  const{error:recipientsError}=await db.from('message_recipients').insert(admins.map(a=>({message_id:m.id,user_id:a.id})))
  if(recipientsError)throw recipientsError
}

async function ensureReports(db,s){
  const{data:existing,error:existingError}=await db.from('reports').select('kind').eq('session_id',s.id)
  if(existingError)throw existingError
  const{data:stored,error:storageError}=await db.storage.from('reports').list(s.id,{limit:20})
  if(storageError)throw storageError
  const storedPaths=new Set((stored||[]).filter(item=>item.id!==null).map(item=>s.id+'/'+item.name))
  const have=new Set((existing||[]).filter(r=>storedPaths.has(r.file_path)).map(r=>r.kind))
  if(have.has('present')&&have.has('absent'))return
  const[
    {data:profiles,error:profilesError},
    {data:recs,error:recordsError}
  ]=await Promise.all([
    db.from('profiles').select('id,full_name,email,phone,address').eq('is_active',true),
    db.from('attendance_records').select('user_id,full_name,status,checked_in_at').eq('session_id',s.id)
  ])
  if(profilesError)throw profilesError
  if(recordsError)throw recordsError
  const seen=new Set((recs||[]).map(r=>r.user_id))
  const missing=(profiles||[]).filter(p=>!seen.has(p.id)).map(p=>({session_id:s.id,user_id:p.id,full_name:p.full_name,status:'absent'}))
  if(missing.length){
    const{error}=await db.from('attendance_records').upsert(missing,{onConflict:'session_id,user_id',ignoreDuplicates:true})
    if(error)throw error
  }
  const contacts=Object.fromEntries((profiles||[]).map(p=>[p.id,{email:p.email||'',phone:p.phone||'',address:p.address||''}]))
  const rows=[...(recs||[]),...missing].map(r=>({...r,...(contacts[r.user_id]||{})}))
  const present=rows.filter(r=>r.status==='present').sort((a,b)=>new Date(a.checked_in_at)-new Date(b.checked_in_at))
  const absent=rows.filter(r=>r.status==='absent')
  const files={present:await presentBuffer(present),absent:await absentBuffer(absent,s.meeting_date)}
  for(const kind of ['present','absent']){
    if(have.has(kind))continue
    const path=`${s.id}/${kind}.xlsx`
    const up=await db.storage.from('reports').upload(path,files[kind],{contentType:XLSX,upsert:true})
    if(up.error)throw up.error
    const{error:reportError}=await db.from('reports').upsert(
      {session_id:s.id,kind,file_path:path},
      {onConflict:'session_id,kind'}
    )
    if(reportError)throw reportError
  }
}

export async function attemptEmail(db,s,attemptNo){
  try{
    const{data:st}=await db.from('settings').select('value').eq('key','admin_report_email').single()
    const to=st?.value?.trim()
    if(!to)throw new Error('بريد الأدمن مش مضبوط في الإعدادات')
    const{data:reps}=await db.from('reports').select('kind,file_path').eq('session_id',s.id)
    const present=reps?.find(r=>r.kind==='present')
    const absent=reps?.find(r=>r.kind==='absent')
    if(!present||!absent)throw new Error('ملفات التقارير لسه مش جاهزة')
    const attachments=[]
    for(const [kind,report] of [['present',present],['absent',absent]]){
      const{data,error}=await db.storage.from('reports').download(report.file_path)
      if(error)throw new Error('تعذر قراءة ملف التقرير')
      attachments.push({
        filename:`${s.title||'Session'} - ${s.location||''} - ${kind==='present'?'Present':'Absent'}.xlsx`,
        buffer:Buffer.from(await data.arrayBuffer())
      })
    }
    await sendReportEmail({to,attachments,meetingDate:s.meeting_date,sessionTitle:s.title,location:s.location})
    await db.from('email_log').insert({session_id:s.id,status:'sent',attempts:attemptNo})
    return{ok:true}
  }catch(e){
    const error=String(e.message||e).slice(0,300)
    await db.from('email_log').insert({session_id:s.id,status:'failed',attempts:attemptNo,error})
    if(attemptNo===MAX_ATTEMPTS){
      try{
        await notifyAdmins(db,`فشل إرسال تقرير الحضور (${s.meeting_date})`,`حاولنا نبعت التقرير ${MAX_ATTEMPTS} مرات وفشلنا. السبب: ${error}\nالملفين موجودين وتقدر تنزّلهم من صفحة التقارير.`)
      }catch{}
    }
    return{ok:false,error}
  }
}

async function maybeEmail(db,s){
  if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)return false
  const{data:recipient,error:recipientError}=await db.from('settings').select('value').eq('key','admin_report_email').maybeSingle()
  if(recipientError)throw recipientError
  if(!recipient?.value?.trim())return false
  const{data:logs,error:logsError}=await db.from('email_log').select('status,created_at').eq('session_id',s.id).order('created_at',{ascending:false})
  if(logsError)throw logsError
  if((logs||[]).some(l=>l.status==='sent'))return false
  if((logs||[]).length>=MAX_ATTEMPTS)return false
  if(logs?.[0]&&Date.now()-new Date(logs[0].created_at)<RETRY_AFTER_MS)return false
  const{count,error:countError}=await db.from('reports').select('id',{count:'exact',head:true}).eq('session_id',s.id)
  if(countError)throw countError
  if((count||0)<2)return false
  await attemptEmail(db,s,(logs||[]).length+1)
  return true
}

export async function resendReport(sessionId){
  const db=createAdminClient()
  const{data:s,error}=await db.from('attendance_sessions').select('id,meeting_date,title,location,status').eq('id',sessionId).single()
  if(error||!s||s.status!=='closed')return{ok:false,error:'الجلسة لسه ما اتقفلتش'}
  await ensureReports(db,s)
  const{count,error:countError}=await db.from('email_log').select('id',{count:'exact',head:true}).eq('session_id',s.id)
  if(countError)throw countError
  return attemptEmail(db,s,(count||0)+1)
}

async function processBirthdayMessages(db){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Cairo',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date())
  const get=k=>Number(parts.find(p=>p.type===k)?.value)
  const year=get('year'),month=get('month'),day=get('day')
  const{data:claimed,error:claimError}=await db.from('birthday_message_log').insert({birthday_year:year,birthday_month:month,birthday_day:day}).select('id').maybeSingle()
  if(claimError){
    if(claimError.code==='23505')return false
    throw claimError
  }
  if(!claimed)return false
  const{data:profiles,error:profilesError}=await db.from('profiles').select('id,full_name,birth_date').eq('is_active',true).not('birth_date','is',null)
  if(profilesError){
    await db.from('birthday_message_log').delete().eq('id',claimed.id)
    throw profilesError
  }
  const birthday=(profiles||[]).filter(p=>{
    const d=new Date(`${p.birth_date}T12:00:00Z`)
    return d.getUTCMonth()+1===month&&d.getUTCDate()===day
  })
  if(!birthday.length)return false
  const names=birthday.map(p=>p.full_name).join('، ')
  const{data:m,error:messageError}=await db.from('messages').insert({
    title:'🎂 عيد ميلاد سعيد!',
    body:`🎂 النهارده عيد ميلاد ${names}! كل سنة وأنتم طيبين، وربنا يفرّح قلوبكم ويبارك سنتكم الجديدة. شاركوهم التهنئة يا Aghapy Team! ❤️`
  }).select('id').single()
  if(messageError||!m){
    await db.from('birthday_message_log').delete().eq('id',claimed.id)
    throw messageError||new Error('تعذر إنشاء رسالة عيد الميلاد')
  }
  const{data:recipients,error:recipientsError}=await db.from('profiles').select('id').eq('is_active',true)
  if(recipientsError||!recipients?.length){
    await db.from('messages').delete().eq('id',m.id)
    await db.from('birthday_message_log').delete().eq('id',claimed.id)
    throw recipientsError||new Error('لا يوجد مستلمون نشطون لرسالة عيد الميلاد')
  }
  const{error:recipientError}=await db.from('message_recipients').insert(recipients.map(p=>({message_id:m.id,user_id:p.id})))
  if(recipientError){
    await db.from('messages').delete().eq('id',m.id)
    await db.from('birthday_message_log').delete().eq('id',claimed.id)
    throw recipientError
  }
  const{error:logError}=await db.from('birthday_message_log').update({message_id:m.id}).eq('id',claimed.id)
  if(logError){
    await db.from('messages').delete().eq('id',m.id)
    await db.from('birthday_message_log').delete().eq('id',claimed.id)
    throw logError
  }
  return true
}

export async function processDueSessions(){
  const db=createAdminClient()
  const out={closed:0,emails:0,birthdays:0,errors:[]}
  const{data:due,error:dueError}=await db.from('attendance_sessions').select('id').eq('status','open').lte('ends_at',new Date().toISOString())
  if(dueError)out.errors.push(`تعذر تحميل الجلسات المستحقة: ${dueError.message}`)
  for(const s of due||[]){
    const{data:claimed,error:closeError}=await db.from('attendance_sessions').update({status:'closed',closed_at:new Date().toISOString()}).eq('id',s.id).eq('status','open').select('id')
    if(closeError)out.errors.push(`تعذر إغلاق جلسة ${s.id}: ${closeError.message}`)
    else if(claimed?.length)out.closed++
  }
  let from=0
  while(true){
    const{data:closed,error:closedError}=await db.from('attendance_sessions').select('id,meeting_date,title,location').eq('status','closed').order('meeting_date',{ascending:true}).order('id',{ascending:true}).range(from,from+99)
    if(closedError){
      out.errors.push(`تعذر تحميل الجلسات المقفولة: ${closedError.message}`)
      break
    }
    for(const s of closed||[]){
      try{
        await ensureReports(db,s)
        if(await maybeEmail(db,s))out.emails++
      }catch(e){
        out.errors.push(`${s.title||s.meeting_date}: ${e.message||e}`)
      }
    }
    if(!closed||closed.length<100)break
    from+=100
  }
  try{
    out.birthdays=await processBirthdayMessages(db)
  }catch(e){
    out.errors.push(`تعذر إرسال تهنئة أعياد الميلاد: ${e.message||e}`)
  }
  return out
}
