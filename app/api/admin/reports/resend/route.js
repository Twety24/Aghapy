import { NextResponse } from 'next/server'
import { getSeniorAdmin } from '@/lib/guard'
import { resendReport } from '@/lib/closeSession'

export const maxDuration = 60

export async function POST(req) {
  if (!(await getSeniorAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  const { sessionId } = await req.json().catch(() => ({}))
  if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return NextResponse.json({ message: 'معرّف الجلسة غير صالح.' }, { status: 400 })
  }
  try {
    const result = await resendReport(sessionId)
    return NextResponse.json(
      result.ok ? { message: 'اتبعت التقرير على بريد الأدمن.' } : { message: `فشل الإرسال: ${result.error}` },
      { status: result.ok ? 200 : 500 }
    )
  } catch {
    return NextResponse.json({ message: 'تعذر تجهيز التقرير أو إرساله. راجع إعدادات البريد وسجل الأخطاء.' }, { status: 500 })
  }
}
