import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PUBLIC = ['/login', '/register', '/forgot-password', '/reset-password', '/auth']

function withCookies(url, response) {
  const redirect = NextResponse.redirect(url)
  response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie))
  return redirect
}

export async function proxy(request) {
  const path = request.nextUrl.pathname
  const isCron = path === '/api/cron' || path.startsWith('/api/cron/')
  const isPublic = PUBLIC.some(p => path === p || path.startsWith(p + '/'))
  const isAuthPage = path === '/login' || path === '/register'

  if (isCron) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        }
      }
    }
  )
  const { data, error } = await supabase.auth.getClaims()
  const userId = !error ? data?.claims?.sub : null

  if (!userId) {
    if (isPublic) return response
    return withCookies(new URL('/login', request.url), response)
  }

  if (isAuthPage) return withCookies(new URL('/dashboard', request.url), response)

  if (path !== '/profile') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle()

    if (profile && !profile.avatar_url) {
      const url = request.nextUrl.clone()
      url.pathname = '/profile'
      url.search = '?complete=photo'
      return withCookies(url, response)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.jpg|icons|manifest.json|sw.js).*)']
}
