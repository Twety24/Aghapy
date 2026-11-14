import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/guard'
import { disconnectGmail } from '@/lib/gmail'

export const runtime='nodejs'

export async function POST(request){
  if(!(await getAdmin()))return NextResponse.json({message:'مش مسموح.'},{status:403})
  try{
    await disconnectGmail()
    return NextResponse.redirect(new URL('/admin/settings?gmail=disconnected',request.url),303)
  }catch{
    return NextResponse.redirect(new URL('/admin/settings?gmail=disconnect-error',request.url),303)
  }
}
