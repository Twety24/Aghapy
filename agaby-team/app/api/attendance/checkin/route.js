import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseToken, verifyToken } from '@/lib/attendance'

const out = (code, message, status = 200) => NextResponse.json({ code, message }, { status })

export async function POST(req) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return out('auth', 'سجّل دخول الأول.', 401)

  const { token } = await req.json().catch(() => ({}))
  const parsed = parseToken(token)
  if (!parsed) return out('invalid', 'الكود ده مش كود حضور صحيح.', 400)

  const db = createAdminClient()
  const { data: profile } = await db.from('profiles').select('full_name, is_active').eq('id', user.id).single()
  if (!profile?.is_active) return out('suspended', 'الحساب موقوف.', 403)

  const { data: session } = await db.from('attendance_sessions').select('*').eq('id', parsed.id).single()
  if (!session || !verifyToken(session, parsed)) return out('invalid', 'الكود منتهي أو غير صحيح. اطلب من المسؤول يعرض الكود الحالي.', 400)

  const now = new Date() // server time only, never the phone's clock
  if (session.status !== 'open' || now >= new Date(session.ends_at)) return out('closed', 'انتهى وقت تسجيل الحضور.', 410)
  if (now < new Date(session.starts_at)) return out('early', 'التسجيل لسه ما بدأش.', 425)

  const { error } = await db.from('attendance_records').insert({
    session_id: session.id, user_id: user.id, full_name: profile.full_name, status: 'present', checked_in_at: now.toISOString()
  })
  if (error?.code === '23505') return out('already', 'حضورك اتسجّل قبل كده.')
  if (error) return out('error', 'حصلت مشكلة. جرّب تاني.', 500)
  return out('ok', 'تم تسجيل حضورك. شكراً ليك!')
}
