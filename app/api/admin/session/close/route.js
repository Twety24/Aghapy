import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { processDueSessions } from '@/lib/closeSession'

export const maxDuration = 60

export async function POST(req) {
  if (!(await getAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  if (process.env.ALLOW_TEST_SESSIONS !== 'true') return NextResponse.json({ message: 'الوضع التجريبي مقفول.' }, { status: 403 })
  const { sessionId } = await req.json().catch(() => ({}))
  if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return NextResponse.json({ message: 'معرّف الجلسة غير صالح.' }, { status: 400 })
  }
  const db = createAdminClient()
  const { data, error } = await db
    .from('attendance_sessions')
    .update({ ends_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('status', 'open')
    .select('id')
    .maybeSingle()
  if (error) return NextResponse.json({ message: 'تعذر إنهاء الجلسة التجريبية.' }, { status: 500 })
  if (!data) return NextResponse.json({ message: 'الجلسة غير موجودة أو مقفولة بالفعل.' }, { status: 404 })
  try {
    return NextResponse.json({ result: await processDueSessions() })
  } catch {
    return NextResponse.json({ message: 'تم إنهاء الجلسة لكن تعذرت معالجة التقارير.' }, { status: 500 })
  }
}
