import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Gallery from '@/components/Gallery'
export const dynamic='force-dynamic'
export default async function Page(){
 const db=await createClient();const{data:{user}}=await db.auth.getUser();if(!user)redirect('/login')
 const[{data:albums},{data:me}]=await Promise.all([db.from('albums').select('id,title').order('created_at',{ascending:false}),db.from('profiles').select('role').eq('id',user.id).single()])
 return <Gallery albums={albums||[]} isAdmin={me?.role==='admin'} userId={user.id}/>
}
