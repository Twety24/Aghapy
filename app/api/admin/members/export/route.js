import { NextResponse } from 'next/server'
import { getSeniorAdmin } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { membersBuffer } from '@/lib/reports'

export async function GET() {
  if (!(await getSeniorAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  const { data, error } = await createAdminClient().from('profiles').select('full_name,email,phone,address,birth_date,stage,department,role,admin_level,is_active,created_at').order('full_name')
  if (error) return NextResponse.json({ message: 'تعذر تجهيز ملف الأعضاء.' }, { status: 500 })
  return new Response(await membersBuffer(data || []), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Members.xlsx"'
    }
  })
}
