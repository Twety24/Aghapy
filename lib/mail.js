export async function sendReportEmail({to,attachments,meetingDate}){
 const key=process.env.RESEND_API_KEY
 if(!key)throw new Error('RESEND_API_KEY مش مضبوط')
 const from=process.env.MAIL_FROM
 if(!from)throw new Error('MAIL_FROM مش مضبوط. أضف بريد إرسال تابعًا لدومين موثّق في Resend.')
 const text=`Dear Aghapy Team Administrator,\n\nThe attendance session on ${meetingDate||'the scheduled date'} has been completed.\n\nAttached are the attendance reports:\n1. Present Members.xlsx\n2. Absent Members.xlsx\n\nAghapy Team Attendance System`
 const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:`Aghapy Team - Attendance Report - ${meetingDate||''}`,text,attachments:attachments.map(a=>({filename:a.filename,content:a.buffer.toString('base64')}))})})
 if(!res.ok)throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0,200)}`)
}
