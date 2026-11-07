import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { processDueSessions } from '@/lib/closeSession'

export const maxDuration = 60

// test helper: ends the open session right now and runs the same closing job as the scheduler
export async function POST() {
  if (!(await getAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  if (process.env.ALLOW_TEST_SESSIONS !== 'true') return NextResponse.json({ message: 'الوضع التجريبي مقفول.' }, { status: 403 })
  await createAdminClient().from('attendance_sessions').update({ ends_at: new Date().toISOString() }).eq('status', 'open')
  return NextResponse.json({ result: await processDueSessions() })
}
