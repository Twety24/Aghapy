import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { makeToken } from '@/lib/attendance'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  if (!(await getAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('sessionId')
  const { data: s } = await createAdminClient().from('attendance_sessions').select('*').eq('id', id).single()
  if (!s) return NextResponse.json({ message: 'الجلسة مش موجودة.' }, { status: 404 })
  const now = new Date()
  if (s.status !== 'open' || now >= new Date(s.ends_at)) return NextResponse.json({ message: 'الجلسة انتهت.' }, { status: 410 })
  if (now < new Date(s.starts_at)) return NextResponse.json({ message: 'الجلسة لسه ما بدأتش.' }, { status: 425 })
  return NextResponse.json({ token: makeToken(s) }, { headers: { 'Cache-Control': 'no-store' } })
}
