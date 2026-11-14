import { isGmailReady, sendGmailReport } from '@/lib/gmail'

export async function sendReportEmail({to,attachments,meetingDate}){
  return sendGmailReport({to,attachments,meetingDate})
}

export async function isReportEmailReady(db){
  return isGmailReady(db)
}
