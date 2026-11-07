import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { membersBuffer } from '@/lib/reports'

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  const { data } = await createAdminClient().from('profiles').select('full_name, email, role, is_active, created_at').order('full_name')
  return new Response(await membersBuffer(data || []), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Members.xlsx"'
    }
  })
}
