import {createClient} from '@/lib/supabase/server'
import MeetingEditor from '@/components/MeetingEditor'
export const dynamic='force-dynamic'
export default async function Page(){const{data}=await(await createClient()).from('meeting_content').select('*').eq('id',1).maybeSingle();return <MeetingEditor initial={data||{hymns:'',word_title:'',word_summary:'',image_path:null}}/>}
