import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ProfileForm from '@/components/ProfileForm'
export const dynamic = 'force-dynamic'
export default async function Page() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await createAdminClient().from('profiles').select('id,full_name,phone,address,age,birth_date,stage,department,avatar_url').eq('id', user.id).single()
  if (!profile) redirect('/dashboard')
  return <ProfileForm profile={profile} email={user.email} />
}
