import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PUBLIC = ['/login', '/register', '/forgot-password', '/reset-password', '/auth', '/api/cron']

export async function proxy(request) {
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC.some((p) => path.startsWith(p))
  if (isPublic) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

  if (!userId) return NextResponse.redirect(new URL('/login', request.url))
  if (path === '/login' || path === '/register') return NextResponse.redirect(new URL('/dashboard', request.url))
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.jpg|icons|manifest.json|sw.js).*)']
}
