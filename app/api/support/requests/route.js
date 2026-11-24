import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ requests: [] }, { status: 401 })
  const db = createAdminClient()
  const { data, error } = await db.from('admin_support_sessions')
    .select('id,status,requested_at,expires_at,admin:profiles!admin_support_sessions_admin_id_fkey(full_name)')
    .eq('member_id', user.id).eq('status', 'pending').gt('expires_at', new Date().toISOString())
    .order('requested_at', { ascending: false })
  if (error) return NextResponse.json({ message: 'تعذر تحميل طلبات الدعم.' }, { status: 500 })
  return NextResponse.json({ requests: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ message: 'يجب تسجيل الدخول.' }, { status: 401 })
  const { sessionId, decision } = await req.json().catch(() => ({}))
  if (!sessionId || !['accept','decline'].includes(decision)) return NextResponse.json({ message: 'الطلب غير صالح.' }, { status: 400 })
  const db = createAdminClient()
  const { data: session } = await db.from('admin_support_sessions').select('id,admin_id,member_id,status,expires_at').eq('id', sessionId).eq('member_id', user.id).single()
  if (!session || session.status !== 'pending' || new Date(session.expires_at) <= new Date()) return NextResponse.json({ message: 'انتهت صلاحية الطلب.' }, { status: 410 })
  const accepted = decision === 'accept'
  const expiresAt = accepted ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : session.expires_at
  const { error } = await db.from('admin_support_sessions').update({
    status: accepted ? 'active' : 'declined',
    accepted_at: accepted ? new Date().toISOString() : null,
    expires_at: expiresAt,
    ended_at: accepted ? null : new Date().toISOString()
  }).eq('id', sessionId).eq('status', 'pending')
  if (error) return NextResponse.json({ message: 'تعذر تحديث طلب الدعم.' }, { status: 500 })
  await db.from('admin_support_audit').insert({ session_id: sessionId, actor_id: user.id, event: accepted ? 'member_accepted' : 'member_declined' })
  return NextResponse.json({ ok: true })
}
