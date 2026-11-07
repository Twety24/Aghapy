import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { processDueSessions } from '@/lib/closeSession'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

function authorized(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const a = Buffer.from(req.headers.get('authorization') || '')
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await processDueSessions())
  } catch (e) {
    return NextResponse.json({ message: String(e.message || e) }, { status: 500 })
  }
}
