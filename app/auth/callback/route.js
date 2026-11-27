import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const url = new URL(request.url)
  const { origin, searchParams } = url
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next') || '/dashboard'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard'
  const authError = searchParams.get('error_description') || searchParams.get('error')
  if (authError) return NextResponse.redirect(new URL('/login?auth_error=confirmation', origin))
  if (!code) return NextResponse.redirect(new URL('/login?auth_error=confirmation', origin))
  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL('/login?auth_error=confirmation', origin))
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login?auth_error=confirmation', origin))
  if (next === '/reset-password') return NextResponse.redirect(new URL('/reset-password', origin))
  const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle()
  const destination = !profile?.avatar_url ? '/auth/complete-photo' : next
  return NextResponse.redirect(new URL(destination, origin))
}
