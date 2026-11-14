import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/guard'
import { createOAuthState } from '@/lib/gmail'

export const runtime='nodejs'

export async function GET(request){
  const context=await getAdminContext()
  if(!context)return NextResponse.redirect(new URL('/login',request.url))
  if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET||!process.env.GMAIL_TOKEN_ENCRYPTION_KEY){
    return NextResponse.redirect(new URL('/admin/settings?gmail=missing-config',request.url))
  }
  const state=createOAuthState(context.user.id)
  const callback=new URL('/api/admin/gmail/callback',process.env.APP_URL||request.url).toString()
  const params=new URLSearchParams({
    client_id:process.env.GOOGLE_CLIENT_ID,
    redirect_uri:callback,
    response_type:'code',
    scope:'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
    access_type:'offline',
    prompt:'consent',
    include_granted_scopes:'true',
    state
  })
  const response=NextResponse.redirect('https://accounts.google.com/o/oauth2/v2/auth?'+params.toString())
  response.cookies.set('aghapy_gmail_oauth_state',state,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:600})
  return response
}
