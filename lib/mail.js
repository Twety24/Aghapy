const BODY = `Dear Administrator,

The attendance session for this Saturday has been completed.

Please find attached the two attendance reports:

1. Present Members.xlsx
2. Absent Members.xlsx

The reports contain the attendance records for this week's meeting.

Agaby Team Attendance System`

// Resend REST API. The key lives only in server env vars.
export async function sendReportEmail({ to, attachments }) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY مش مضبوط')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'Agaby Team <onboarding@resend.dev>',
      to: [to],
      subject: 'Agaby Team - Weekly Attendance Report',
      text: BODY,
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.buffer.toString('base64') }))
    })
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`)
}
