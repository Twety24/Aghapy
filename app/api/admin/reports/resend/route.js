import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/guard'
import { resendReport } from '@/lib/closeSession'

export const maxDuration = 60

export async function POST(req) {
  if (!(await getAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  const { sessionId } = await req.json().catch(() => ({}))
  const r = await resendReport(sessionId)
  return NextResponse.json(r.ok ? { message: 'اتبعت التقرير على بريد الأدمن.' } : { message: `فشل الإرسال: ${r.error}` }, { status: r.ok ? 200 : 500 })
}
