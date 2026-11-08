import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import ProfileForm from '@/components/ProfileForm'
export const dynamic='force-dynamic'
export default async function Page(){const db=await createClient();const{data:{user}}=await db.auth.getUser();if(!user)redirect('/login');const{data:p}=await db.from('profiles').select('id,full_name,phone,age,stage,department').eq('id',user.id).single();return <ProfileForm profile={p} email={user.email}/>}
