import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'

const fail = (message, status = 400) => NextResponse.json({ message }, { status })

export async function GET(req, { params }) {
  const context = await getAdminContext()
  if (!context?.profile?.is_root) return fail('وضع الدعم متاح لـ Super Admin فقط.', 403)
  const { id } = await params
  const db = createAdminClient()
  const { data: session } = await db.from('admin_support_sessions').select('id,admin_id,member_id,status,accepted_at,expires_at').eq('id', id).eq('admin_id', context.user.id).single()
  if (!session) return fail('جلسة الدعم غير موجودة.', 404)
  if (session.status !== 'active' || new Date(session.expires_at) <= new Date()) {
    if (session.status === 'active') {
      await db.from('admin_support_sessions').update({ status: 'expired', ended_at: new Date().toISOString() }).eq('id', id)
      await db.from('admin_support_audit').insert({ session_id: id, actor_id: context.user.id, event: 'session_expired' })
    }
    return fail('انتهت جلسة الدعم أو ألغى العضو موافقته.', 410)
  }
  const [{ data: member }, { data: attendance }, { data: viewed }] = await Promise.all([
    db.from('profiles').select('id,full_name,avatar_url,phone,address,birth_date,stage,department').eq('id', session.member_id).single(),
    db.from('attendance_records').select('status,checked_in_at,attendance_sessions(meeting_date,title)').eq('user_id', session.member_id).order('checked_in_at', { ascending: false }).limit(20),
    db.from('admin_support_audit').select('id').eq('session_id', id).eq('event', 'support_view_opened').limit(1)
  ])
  if (!member) return fail('بيانات العضو غير متاحة.', 404)
  if (!viewed?.length) await db.from('admin_support_audit').insert({ session_id: id, actor_id: context.user.id, event: 'support_view_opened' })
  return NextResponse.json({ session: { id: session.id, expires_at: session.expires_at }, member, attendance: attendance || [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(req, { params }) {
  const context = await getAdminContext()
  if (!context?.profile?.is_root) return fail('وضع الدعم متاح لـ Super Admin فقط.', 403)
  const { id } = await params
  const db = createAdminClient()
  const { data: session } = await db.from('admin_support_sessions').select('id,status').eq('id', id).eq('admin_id', context.user.id).single()
  if (!session) return fail('جلسة الدعم غير موجودة.', 404)
  if (session.status === 'active' || session.status === 'pending') {
    const { error } = await db.from('admin_support_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', id)
    if (error) return fail('تعذر إنهاء الجلسة.', 500)
    await db.from('admin_support_audit').insert({ session_id: id, actor_id: context.user.id, event: 'admin_ended_session' })
  }
  return NextResponse.json({ ok: true })
}
