'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPendingAvatar, clearPendingAvatar } from '@/lib/pending-avatar'

export default function CompletePhotoPage() {
  const router = useRouter()
  const [message, setMessage] = useState('بنكمّل حفظ الصورة الشخصية...')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    async function complete() {
      const db = createClient()
      const { data: { user } } = await db.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data: profile, error: profileError } = await db.from('profiles').select('avatar_url,address').eq('id', user.id).maybeSingle()
      if (profileError) throw profileError
      if (profile?.avatar_url) {
        try { await clearPendingAvatar() } catch {}
        router.replace(!profile.address?.trim() ? '/profile?complete=address' : '/dashboard')
        router.refresh()
        return
      }
      let photo
      try {
        photo = await getPendingAvatar()
      } catch {
        photo = null
      }
      if (!photo) {
        router.replace('/profile?complete=photo')
        return
      }
      const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'
      const path = user.id + '/' + Date.now() + '.' + ext
      const up = await db.storage.from('avatars').upload(path, photo, { upsert: false, contentType: photo.type, cacheControl: '3600' })
      if (up.error) {
        if (active) {
          setMessage('ماقدرناش نرفع الصورة تلقائيًا. ممكن تكون صلاحية التخزين أو الاتصال. جرّب تاني أو ارفعها من بياناتي.')
          setFailed(true)
        }
        return
      }
      const avatarUrl = db.storage.from('avatars').getPublicUrl(path).data.publicUrl
      const saved = await db.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
      if (saved.error) {
        await db.storage.from('avatars').remove([path])
        if (active) {
          setMessage('الصورة اترفعت لكن ماقدرناش نحفظها في الملف الشخصي. جرّب من بياناتي.')
          setFailed(true)
        }
        return
      }
      await clearPendingAvatar()
      router.replace('/dashboard')
      router.refresh()
    }
    complete().catch(() => {
      if (active) {
        setMessage('حصل خطأ أثناء تجهيز الصورة. جرّب رفعها من بياناتي.')
        setFailed(true)
      }
    })
    return () => { active = false }
  }, [router])

  return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ice p-6 text-center text-navy">
    <p role="status">{message}</p>
    {failed && <Link href="/profile?complete=photo" className="btn btn-red">فتح بياناتي ورفع الصورة</Link>}
  </main>
}
