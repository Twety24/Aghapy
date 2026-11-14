'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
const departments = [['acting','تمثيل'],['scenography','سينغرافيا'],['media','ميديا'],['music_prep','إعداد موسيقى'],['other','أخرى']]
export default function ProfileForm({ profile, email }) {
  const router = useRouter()
  const [db] = useState(() => createClient())
  const [form, setForm] = useState({ name: profile.full_name || '', phone: profile.phone || '', address: profile.address || '', birth_date: profile.birth_date || '', stage: profile.stage || '', department: profile.department || '' })
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState(profile.avatar_url || '')
  async function save(e) {
    e.preventDefault()
    if (photo && !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) { setMsg('نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP.'); return }
    if (photo && photo.size > 5 * 1024 * 1024) { setMsg('حجم الصورة لازم يكون 5 ميجابايت أو أقل.'); return }
    setBusy(true)
    setMsg('')
    let avatar_url = profile.avatar_url || null
    if (photo) {
      const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = profile.id + '/' + Date.now() + '.' + ext
      const up = await db.storage.from('avatars').upload(path, photo, { upsert: false, contentType: photo.type || 'image/jpeg', cacheControl: '3600' })
      if (up.error) { setBusy(false); setMsg('فشل رفع الصورة. جرّب صورة تانية.'); return }
      avatar_url = db.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    const { error } = await db.from('profiles').update({ full_name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() || null, birth_date: form.birth_date || null, stage: form.stage, department: form.department, avatar_url }).eq('id', profile.id)
    if (error) {
      if (photo && avatar_url) {
        const path = avatar_url.split('/avatars/')[1]
        if (path) await db.storage.from('avatars').remove([decodeURIComponent(path)])
      }
      setBusy(false)
      setMsg('ماقدرناش نحفظ البيانات. جرّب تاني.')
      return
    }
    setBusy(false)
    setMsg('تم حفظ بياناتك وصورتك.')
    router.refresh()
  }
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  return <main className="mx-auto min-h-dvh max-w-md bg-white px-5 py-6">
    <Link href="/dashboard" className="text-sm underline">رجوع</Link>
    <h1 className="mt-4 text-2xl font-bold">بياناتي</h1>
    <p className="mt-2 text-sm text-navy/60" dir="ltr">{email}</p>
    <form onSubmit={save} className="mt-5 space-y-4">
      <div className="text-center">
        <img src={preview || '/logo.jpg'} alt="الصورة الشخصية" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo.jpg' }} className="mx-auto h-28 w-28 rounded-full border-4 border-white bg-white object-cover shadow-md" />
        <label className="btn btn-navy mt-3 cursor-pointer">تغيير الصورة<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const file = e.target.files?.[0] || null; setPhoto(file); if (file) setPreview(URL.createObjectURL(file)) }} /></label>
      </div>
      <div><label className="label">الاسم بالكامل</label><input className="input" required value={form.name} onChange={set('name')} /></div>
      <div><label className="label">رقم التليفون</label><input className="input" dir="ltr" type="tel" required value={form.phone} onChange={set('phone')} /></div>
      <div><label className="label">العنوان</label><textarea className="input min-h-20" maxLength={300} value={form.address} onChange={set('address')} placeholder="اكتب عنوانك بالتفصيل" /></div>
      <div><label className="label">تاريخ الميلاد</label><input className="input" type="date" max={new Date().toISOString().slice(0,10)} value={form.birth_date} onChange={set('birth_date')} /><p className="mt-1 text-xs text-navy/50">تاريخ الميلاد اللي سجلته وقت إنشاء الحساب.</p></div>
      <div><label className="label">المرحلة</label><select className="input" value={form.stage} onChange={set('stage')}><option value="">اختار</option><option value="prep">إعدادي</option><option value="secondary">ثانوي</option><option value="university">جامعة</option><option value="graduated">خريج</option></select></div>
      <div><label className="label">القسم</label><select className="input" value={form.department} onChange={set('department')}><option value="">اختار</option>{departments.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      {msg && <p className="text-sm" role="status">{msg}</p>}
      <button className="btn btn-red" disabled={busy}>{busy ? 'جاري الحفظ...' : 'حفظ'}</button>
    </form>
  </main>
}
