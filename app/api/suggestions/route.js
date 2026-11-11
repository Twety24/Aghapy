import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const fail = (message, status = 400) => NextResponse.json({ message }, { status })

export async function POST(req) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return fail('سجّل دخول الأول.', 401)

  const body = await req.json().catch(() => ({}))
  const content = String(body.content || '').trim()
  const isAnonymous = body.isAnonymous === true
  const adminIds = Array.isArray(body.adminIds) ? [...new Set(body.adminIds.filter(id => typeof id === 'string'))] : []
  if (content.length < 5 || content.length > 2000) return fail('الاقتراح لازم يكون من 5 إلى 2000 حرف.')
  if (!adminIds.length || adminIds.length > 30) return fail('اختار مسؤولاً واحداً على الأقل.')

  const db = createAdminClient()
  const { data: activeAdmins, error: adminsError } = await db
    .from('profiles')
    .select('id')
    .in('id', adminIds)
    .eq('role', 'admin')
    .eq('is_active', true)
  if (adminsError) return fail('تعذر التحقق من المسؤولين.', 500)
  if ((activeAdmins || []).length !== adminIds.length) return fail('قائمة المسؤولين اتغيرت. حدّث الصفحة واختار من القائمة الجديدة.')

  const { data: suggestion, error: suggestionError } = await db
    .from('suggestions')
    .insert({ user_id: isAnonymous ? null : user.id, is_anonymous: isAnonymous, content })
    .select('id')
    .single()
  if (suggestionError || !suggestion) return fail('ماقدرناش نحفظ الاقتراح.', 500)

  const { error: recipientsError } = await db
    .from('suggestion_recipients')
    .insert(adminIds.map(admin_id => ({ suggestion_id: suggestion.id, admin_id })))
  if (recipientsError) {
    await db.from('suggestions').delete().eq('id', suggestion.id)
    return fail('ماقدرناش نوصل الاقتراح للمسؤولين. جرّب تاني.', 500)
  }

  return NextResponse.json({ ok: true })
}
