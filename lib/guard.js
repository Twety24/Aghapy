import { createClient } from '@/lib/supabase/server'

export async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role, is_active, is_root, admin_level').eq('id', user.id).single()
  if (profile?.role !== 'admin' || !profile.is_active) return null
  return { user, profile }
}

export async function getAdmin() {
  return (await getAdminContext())?.user || null
}

// Kept as a compatibility alias for routes that previously required a higher admin tier.
export async function getSeniorAdmin() {
  return (await getAdminContext())?.user || null
}

export async function getSuperAdmin() {
  const context = await getAdminContext()
  return context?.profile.is_root ? context.user : null
}
