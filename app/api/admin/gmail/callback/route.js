import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/guard'
import { saveGmailConnection, verifyOAuthState } from '@/lib/gmail'

export const runtime='nodejs'

export async function GET(request){
  const url=new URL(request.url)
  const context=await getAdminContext()
  const state=request.cookies.get('aghapy_gmail_oauth_state')?.value
  const redirectTo=(status)=>NextResponse.redirect(new URL('/admin/settings?gmail='+status,process.env.APP_URL||request.url))
  if(!context)return redirectTo('login-required')
  if(url.searchParams.get('error'))return redirectTo('cancelled')
  if(!verifyOAuthState(state,context.user.id)||!url.searchParams.get('code'))return redirectTo('state-error')
  const callback=new URL('/api/admin/gmail/callback',process.env.APP_URL||request.url).toString()
  const body=new URLSearchParams({
    code:url.searchParams.get('code'),
    client_id:process.env.GOOGLE_CLIENT_ID||'',
    client_secret:process.env.GOOGLE_CLIENT_SECRET||'',
    redirect_uri:callback,
    grant_type:'authorization_code'
  })
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body})
  const tokens=await tokenResponse.json().catch(()=>({}))
  if(!tokenResponse.ok||!tokens.refresh_token)return redirectTo('token-error')
  const profileResponse=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:'Bearer '+tokens.access_token}})
  const profile=await profileResponse.json().catch(()=>({}))
  try{
    await saveGmailConnection({refreshToken:tokens.refresh_token,email:profile.email})
    const response=redirectTo('connected')
    response.cookies.delete('aghapy_gmail_oauth_state')
    return response
  }catch{
    return redirectTo('save-error')
  }
}
