import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'

const error = (message, status = 400) => NextResponse.json({ message }, { status })

export async function GET() {
  const context = await getAdminContext()
  if (!context) return error('مش مسموح.', 403)
  const senior = context.profile.is_root || context.profile.admin_level === 'senior_admin'
  const columns = senior
    ? 'id,full_name,email,phone,address,birth_date,stage,department,role,admin_level,is_active,created_at,avatar_url,is_root'
    : 'id,full_name,birth_date,stage,department,role,admin_level,is_active,created_at,avatar_url,is_root'
  const { data, error: queryError } = await createAdminClient().from('profiles').select(columns).order('full_name')
  if (queryError) return error('تعذر تحميل الأعضاء.', 500)
  return NextResponse.json({
    members: data || [],
    permissions: { isRoot: !!context.profile.is_root, isSenior: senior, userId: context.user.id }
  })
}

export async function PATCH(req) {
  const context = await getAdminContext()
  if (!context) return error('مش مسموح.', 403)
  const { userId, action, value } = await req.json().catch(() => ({}))
  if (!userId || userId === context.user.id) return error('اختيار العضو غير صالح.')
  const db = createAdminClient()
  const { data: target, error: targetError } = await db.from('profiles').select('id,role,admin_level,is_active,is_root').eq('id', userId).single()
  if (targetError || !target || target.is_root) return error('لا يمكن تعديل هذا الحساب.', 403)

  let patch
  if (action === 'rename') {
    const full_name = String(value || '').trim()
    if (full_name.length < 3 || full_name.length > 100) return error('الاسم لازم يكون من 3 إلى 100 حرف.')
    patch = { full_name }
  } else if (action === 'toggle-active') {
    if (target.role === 'admin' && !context.profile.is_root) return error('إيقاف حسابات الأدمن متاح للـSuper Admin فقط.', 403)
    patch = { is_active: !target.is_active }
  } else if (action === 'promote-normal') {
    if (target.role !== 'member') return error('الحساب أدمن بالفعل.')
    patch = { role: 'admin', admin_level: 'admin' }
  } else if (action === 'promote-senior') {
    if (!context.profile.is_root) return error('ترقية الأدمن المتوسط متاحة للـSuper Admin فقط.', 403)
    if (target.role !== 'member' && !(target.role === 'admin' && target.admin_level === 'admin')) return error('لا يمكن ترقية هذا الحساب.')
    patch = { role: 'admin', admin_level: 'senior_admin' }
  } else if (action === 'demote') {
    if (!context.profile.is_root) return error('إزالة صلاحيات الأدمن متاحة للـSuper Admin فقط.', 403)
    if (target.role !== 'admin') return error('الحساب ليس أدمن.')
    patch = { role: 'member', admin_level: null }
  } else {
    return error('الإجراء غير معروف.')
  }

  const { error: updateError } = await db.from('profiles').update(patch).eq('id', userId)
  if (updateError) return error('ماقدرناش ننفّذ التعديل.', 500)
  return NextResponse.json({ ok: true })
}
