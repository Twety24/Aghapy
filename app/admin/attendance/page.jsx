import {redirect} from 'next/navigation'
import {getAdmin} from '@/lib/guard'
import {createClient} from '@/lib/supabase/server'
import AdminAttendance from '@/components/AdminAttendance'
export const dynamic='force-dynamic'
export default async function Page(){if(!(await getAdmin()))redirect('/dashboard');const{data:sessions}=await(await createClient()).from('attendance_sessions').select('id,title,location,meeting_date,starts_at,ends_at,status,created_by,created_by_profile:profiles!attendance_sessions_created_by_fkey(full_name)').order('starts_at',{ascending:false}).limit(30);return <AdminAttendance initial={sessions||[]}/>}
