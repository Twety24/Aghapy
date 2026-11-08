import {notFound,redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import GroupChat from '@/components/GroupChat'
export const dynamic='force-dynamic'
export default async function Page({params}){const{id}=await params;const db=await createClient();const{data:{user}}=await db.auth.getUser();if(!user)redirect('/login');const{data:g}=await db.from('groups').select('id,name').eq('id',id).maybeSingle();if(!g)notFound();return <GroupChat groupId={g.id} name={g.name}/>}
