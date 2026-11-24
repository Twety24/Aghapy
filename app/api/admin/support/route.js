import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'

const fail = (message, status = 400) => NextResponse.json({ message }, { status })

export async function POST(req) {
  const context = await getAdminContext()
  if (!context?.profile?.is_root) return fail('وضع الدعم متاح لـ Super Admin فقط.', 403)
  const { memberId } = await req.json().catch(() => ({}))
  if (!memberId || memberId === context.user.id) return fail('اختيار العضو غير صالح.')
  const db = createAdminClient()
  const { data: member } = await db.from('profiles').select('id,role,is_active').eq('id', memberId).single()
  if (!member || member.role !== 'member' || !member.is_active) return fail('وضع الدعم متاح للأعضاء النشطين فقط.')
  const now = Date.now()
  const { data: existing } = await db.from('admin_support_sessions').select('id').eq('admin_id', context.user.id).eq('member_id', memberId).in('status', ['pending','active']).gt('expires_at', new Date(now).toISOString()).limit(1)
  if (existing?.length) return fail('يوجد طلب دعم مفتوح بالفعل لهذا العضو.')
  const expiresAt = new Date(now + 10 * 60 * 1000).toISOString()
  const { data: session, error } = await db.from('admin_support_sessions').insert({ admin_id: context.user.id, member_id: memberId, expires_at: expiresAt }).select('id,status,expires_at').single()
  if (error) return fail('تعذر إنشاء طلب الدعم.', 500)
  await db.from('admin_support_audit').insert({ session_id: session.id, actor_id: context.user.id, event: 'request_created', details: { member_id: memberId } })
  return NextResponse.json({ session })
}
