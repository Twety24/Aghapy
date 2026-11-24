import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
  const { pathname } = request.nextUrl
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback']
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/')) || pathname === '/profile') {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return response

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (profile && !profile.avatar_url) {
    const url = request.nextUrl.clone()
    url.pathname = '/profile'
    url.searchParams.set('complete', 'photo')
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
