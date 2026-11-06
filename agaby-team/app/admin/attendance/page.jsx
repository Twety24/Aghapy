import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/guard'
import { createClient } from '@/lib/supabase/server'
import AdminAttendance from '@/components/AdminAttendance'

export const dynamic = 'force-dynamic'

export default async function Page() {
  if (!(await getAdmin())) redirect('/dashboard')
  const { data: latest } = await (await createClient())
    .from('attendance_sessions').select('id, meeting_date, starts_at, ends_at, status')
    .order('meeting_date', { ascending: false }).limit(1).maybeSingle()
  return <AdminAttendance initial={latest} allowTest={process.env.ALLOW_TEST_SESSIONS === 'true'} />
}
