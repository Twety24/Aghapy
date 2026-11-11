import { NextResponse } from 'next/server'
import { getSeniorAdmin } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'
export async function GET(req) {
  if (!(await getSeniorAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ message: 'التقرير مش موجود.' }, { status: 404 })
  const db = createAdminClient()
  const { data: report } = await db.from('reports').select('file_path,kind,attendance_sessions(title,location,meeting_date)').eq('id', id).single()
  if (!report) return NextResponse.json({ message: 'التقرير مش موجود.' }, { status: 404 })
  const session = Array.isArray(report.attendance_sessions) ? report.attendance_sessions[0] : report.attendance_sessions
  const safe = value => String(value || '').replace(/[\\/:*?"<>|]/g, '-').trim()
  const name = `${safe(session?.title || 'Session')} - ${safe(session?.location || '')} - ${report.kind === 'present' ? 'Present' : 'Absent'} - ${session?.meeting_date || ''}.xlsx`
  const { data, error } = await db.storage.from('reports').createSignedUrl(report.file_path, 60, { download: name })
  if (error) return NextResponse.json({ message: 'تعذر تجهيز الملف.' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
