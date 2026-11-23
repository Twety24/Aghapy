import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HOURS = new Set(['matins','third','sixth','ninth','vespers','compline','midnight_first','midnight_second','midnight_third'])
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'))
const fail = (message, status = 400) => NextResponse.json({ message }, { status })

export async function GET(request) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return fail('سجّل دخول الأول.', 401)
  const weekStart = new URL(request.url).searchParams.get('weekStart')
  if (!validDate(weekStart)) return fail('تاريخ الأسبوع غير صحيح.')
  const end = new Date(weekStart + 'T00:00:00Z')
  end.setUTCDate(end.getUTCDate() + 6)
  const weekEnd = end.toISOString().slice(0, 10)
  const { data, error } = await db.from('spiritual_journal_entries')
    .select('id,entry_date,bible_reading,attended_liturgy,prayed,agpeya_hours,reflection')
    .eq('user_id', user.id).gte('entry_date', weekStart).lte('entry_date', weekEnd).order('entry_date')
  if (error) return fail('تعذر تحميل النوتة.', 500)
  return NextResponse.json({ entries: data || [] })
}

export async function POST(request) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return fail('سجّل دخول الأول.', 401)
  const body = await request.json().catch(() => ({}))
  const entryDate = body.entryDate
  if (!validDate(entryDate)) return fail('تاريخ اليوم غير صحيح.')
  const hours = Array.isArray(body.agpeya_hours) ? [...new Set(body.agpeya_hours)] : []
  if (hours.some(hour => !HOURS.has(hour))) return fail('اختيار ساعة الأجبية غير صحيح.')
  const reflection = typeof body.reflection === 'string' ? body.reflection.trim() : ''
  if (reflection.length > 500) return fail('التأمل لازم يكون 500 حرف أو أقل.')
  const payload = {
    user_id: user.id,
    entry_date: entryDate,
    bible_reading: body.bible_reading === true,
    attended_liturgy: body.attended_liturgy === true,
    prayed: body.prayed === true || hours.length > 0,
    agpeya_hours: hours,
    reflection: reflection || null,
    updated_at: new Date().toISOString()
  }
  const { data, error } = await db.from('spiritual_journal_entries')
    .upsert(payload, { onConflict: 'user_id,entry_date' })
    .select('id,entry_date,bible_reading,attended_liturgy,prayed,agpeya_hours,reflection')
    .single()
  if (error) return fail('ماقدرناش نحفظ التغيير.', 500)
  return NextResponse.json({ entry: data })
}
