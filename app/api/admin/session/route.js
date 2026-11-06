import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { saturdayWindow, cairoParts, dateStr } from '@/lib/attendance'

const COLS = 'id, meeting_date, starts_at, ends_at, status'

export async function POST(req) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  const { test } = await req.json().catch(() => ({}))
  const db = createAdminClient()
  const now = new Date()
  let w

  if (test) {
    if (process.env.ALLOW_TEST_SESSIONS !== 'true') return NextResponse.json({ message: 'الجلسات التجريبية مقفولة.' }, { status: 403 })
    w = { meetingDate: dateStr(cairoParts(now)), starts: now, ends: new Date(now.getTime() + 2 * 3600e3) }
    await db.from('attendance_sessions').delete().eq('meeting_date', w.meetingDate) // test mode replaces today's session
  } else {
    w = saturdayWindow(now)
    if (!w) return NextResponse.json({ message: 'جلسة الحضور بتتعمل يوم السبت بس.' }, { status: 400 })
  }

  const existing = await db.from('attendance_sessions').select(COLS).eq('meeting_date', w.meetingDate).maybeSingle()
  if (existing.data) return NextResponse.json({ session: existing.data })

  const { data, error } = await db.from('attendance_sessions')
    .insert({ meeting_date: w.meetingDate, starts_at: w.starts.toISOString(), ends_at: w.ends.toISOString(), created_by: admin.id })
    .select(COLS).single()
  if (error) return NextResponse.json({ message: 'ماقدرناش ننشئ الجلسة.' }, { status: 500 })
  return NextResponse.json({ session: data })
}
