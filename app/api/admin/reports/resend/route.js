import { NextResponse } from 'next/server'
import { getSeniorAdmin } from '@/lib/guard'
import { resendReport } from '@/lib/closeSession'

export const maxDuration = 60

export async function POST(req) {
  if (!(await getSeniorAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  const { sessionId } = await req.json().catch(() => ({}))
  const result = await resendReport(sessionId)
  return NextResponse.json(result.ok ? { message: 'اتبعت التقرير على بريد الأدمن.' } : { message: `فشل الإرسال: ${result.error}` }, { status: result.ok ? 200 : 500 })
}
