'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { arabicError } from '@/lib/errors'
import AuthShell from '@/components/AuthShell'

const STAGES = [{ value: 'prep', label: 'إعدادي' }, { value: 'secondary', label: 'ثانوي' }, { value: 'university', label: 'جامعة' }, { value: 'working', label: 'بشتغل' }]
const DEPARTMENTS = [{ value: 'acting', label: 'تمثيل' }, { value: 'lighting', label: 'إضاءة' }, { value: 'music', label: 'موسيقى' }, { value: 'decor', label: 'ديكور' }, { value: 'mime', label: 'مايم' }]

export default function RegisterPage() {
  const router = useRouter()
  const [f, setF] = useState({ name: '', phone: '', email: '', age: '', stage: '', department: '', password: '', confirm: '' })
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError(''); setInfo('')
    const age = Number(f.age)
    const phone = f.phone.trim()
    if (f.name.trim().length < 3) return setError('اكتب اسمك بالكامل.')
    if (!/^\+?[0-9٠-٩]{8,15}$/.test(phone.replace(/[\s()-]/g, ''))) return setError('اكتب رقم تليفون صحيح.')
    if (!(age >= 5 && age <= 99)) return setError('اكتب سن صحيح.')
    if (!f.stage || !f.department) return setError('اختار المرحلة والقسم.')
    if (f.password.length < 8) return setError('كلمة السر لازم تكون 8 حروف على الأقل.')
    if (f.password !== f.confirm) return setError('كلمتا السر مش متطابقتين.')
    setBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: { data: { full_name: f.name.trim(), phone, age, stage: f.stage, department: f.department }, emailRedirectTo: `${location.origin}/auth/callback` }
    })
    if (error) { setError(arabicError(error.message)); setBusy(false); return }
    if (data.session && photo) {
      const path = `${data.user.id}/${Date.now()}.jpg`
      const upload = await supabase.storage.from('avatars').upload(path, photo, { upsert: true })
      if (!upload.error) await supabase.from('profiles').update({ avatar_url: supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl }).eq('id', data.user.id)
    }
    if (data.session) { router.replace('/dashboard'); router.refresh(); return }
    setInfo('وصلتك رسالة على بريدك. افتحها وأكد الحساب، وبعدين سجّل دخول.')
    setBusy(false)
  }

  return (
    <AuthShell title="حساب جديد" subtitle="سجّل بياناتك للانضمام لفريق أغابي">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="photo">الصورة الشخصية (اختياري)</label><input id="photo" type="file" accept="image/*" className="input" onChange={(e) => setPhoto(e.target.files?.[0] || null)} /></div>
        <div><label className="label" htmlFor="name">الاسم بالكامل</label><input id="name" required className="input" value={f.name} onChange={set('name')} autoComplete="name" /></div>
        <div><label className="label" htmlFor="phone">رقم التليفون</label><input id="phone" type="tel" required dir="ltr" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="+20 1xxxxxxxxx" /></div>
        <div><label className="label" htmlFor="age">السن</label><input id="age" type="number" min="5" max="99" required className="input" value={f.age} onChange={set('age')} /></div>
        <div><label className="label" htmlFor="stage">المرحلة</label><select id="stage" required className="input" value={f.stage} onChange={set('stage')}><option value="">اختار المرحلة</option>{STAGES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
        <div><label className="label" htmlFor="department">القسم</label><select id="department" required className="input" value={f.department} onChange={set('department')}><option value="">اختار القسم</option>{DEPARTMENTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
        <div><label className="label" htmlFor="email">البريد الإلكتروني</label><input id="email" type="email" required dir="ltr" className="input" value={f.email} onChange={set('email')} autoComplete="email" /></div>
        <div><label className="label" htmlFor="password">كلمة السر (8 حروف على الأقل)</label><input id="password" type="password" required dir="ltr" className="input" value={f.password} onChange={set('password')} autoComplete="new-password" /></div>
        <div><label className="label" htmlFor="confirm">تأكيد كلمة السر</label><input id="confirm" type="password" required dir="ltr" className="input" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></div>
        {error && <p className="alert-error" role="alert">{error}</p>}
        {info && <p className="alert-ok" role="status">{info}</p>}
        <button className="btn btn-red" disabled={busy}>{busy ? 'جاري الإنشاء...' : 'إنشاء الحساب'}</button>
        <p className="text-center text-sm">عندك حساب؟ <Link href="/login" className="font-bold underline">سجّل دخول</Link></p>
      </form>
    </AuthShell>
  )
}
