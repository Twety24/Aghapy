import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req) {
  if (!(await getAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id')
  const db = createAdminClient()
  const { data: r } = await db.from('reports').select('file_path, kind, attendance_sessions(meeting_date)').eq('id', id).single()
  if (!r) return NextResponse.json({ message: 'التقرير مش موجود.' }, { status: 404 })
  const date = (Array.isArray(r.attendance_sessions) ? r.attendance_sessions[0] : r.attendance_sessions)?.meeting_date || ''
  const name = `${r.kind === 'present' ? 'Present Members' : 'Absent Members'} ${date}.xlsx`
  const { data, error } = await db.storage.from('reports').createSignedUrl(r.file_path, 60, { download: name })
  if (error) return NextResponse.json({ message: 'تعذر تجهيز الملف.' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
