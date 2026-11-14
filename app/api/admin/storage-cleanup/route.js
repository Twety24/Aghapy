import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

async function collectFiles(db, bucket, prefix = '') {
  const files = []
  let offset = 0
  while (true) {
    const { data, error } = await db.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' }
    })
    if (error) throw error
    if (!data?.length) break
    for (const item of data) {
      const path = prefix ? prefix + '/' + item.name : item.name
      if (item.id === null) files.push(...await collectFiles(db, bucket, path))
      else files.push(path)
    }
    if (data.length < 1000) break
    offset += data.length
  }
  return files
}

function objectPath(value, bucket) {
  if (typeof value !== 'string' || !value.trim()) return null
  const clean = value.trim().split('?')[0].split('#')[0]
  const marker = '/' + bucket + '/'
  const index = clean.indexOf(marker)
  const path = index >= 0 ? clean.slice(index + marker.length) : clean.replace(/^\/+/, '')
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

async function loadReferences(db) {
  const [profiles, photos, meeting, reports] = await Promise.all([
    db.from('profiles').select('avatar_url'),
    db.from('photos').select('path'),
    db.from('meeting_content').select('image_path'),
    db.from('reports').select('file_path')
  ])
  for (const result of [profiles, photos, meeting, reports]) {
    if (result.error) throw result.error
  }
  return {
    avatars: new Set((profiles.data || []).map(row => objectPath(row.avatar_url, 'avatars')).filter(Boolean)),
    gallery: new Set((photos.data || []).map(row => row.path).filter(Boolean)),
    meeting: new Set((meeting.data || []).map(row => row.image_path).filter(Boolean)),
    reports: new Set((reports.data || []).map(row => row.file_path).filter(Boolean))
  }
}

export async function POST() {
  if (!(await getAdmin())) return NextResponse.json({ message: 'مش مسموح.' }, { status: 403 })
  const db = createAdminClient()
  try {
    const references = await loadReferences(db)
    const removed = {}
    for (const bucket of ['avatars', 'gallery', 'meeting', 'reports']) {
      const files = await collectFiles(db, bucket)
      const orphaned = files.filter(path => !references[bucket].has(path))
      for (let i = 0; i < orphaned.length; i += 1000) {
        const { error } = await db.storage.from(bucket).remove(orphaned.slice(i, i + 1000))
        if (error) throw error
      }
      removed[bucket] = orphaned.length
    }
    return NextResponse.json({ ok: true, removed })
  } catch (error) {
    return NextResponse.json({ message: 'تعذر تنظيف الملفات غير المرتبطة. لم يتم بدء الحذف قبل التأكد من سجلات الربط.' }, { status: 500 })
  }
}
