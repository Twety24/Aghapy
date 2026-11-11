import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ message: 'سجّل دخول الأول.' }, { status: 401 })
  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('id,full_name')
    .eq('role', 'admin')
    .eq('is_active', true)
    .order('full_name')
  if (error) return NextResponse.json({ message: 'تعذر تحميل المسؤولين.' }, { status: 500 })
  return NextResponse.json({ admins: data || [] })
}
