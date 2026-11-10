import {redirect} from 'next/navigation'
import {getAdmin} from '@/lib/guard'
import {createClient} from '@/lib/supabase/server'
import AdminAttendance from '@/components/AdminAttendance'
export const dynamic='force-dynamic'
export default async function Page(){if(!(await getAdmin()))redirect('/dashboard');const{data:sessions}=await(await createClient()).from('attendance_sessions').select('id,title,location,meeting_date,starts_at,ends_at,status,created_by,profiles:created_by(full_name)').order('starts_at',{ascending:false}).limit(30);return <AdminAttendance initial={sessions||[]}/>}
