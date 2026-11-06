'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { arabicError } from '@/lib/errors'
import AuthShell from '@/components/AuthShell'

export default function RegisterPage() {
  const router = useRouter()
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError(''); setInfo('')
    if (f.name.trim().length < 3) return setError('اكتب اسمك بالكامل.')
    if (f.password.length < 8) return setError('كلمة السر لازم تكون 8 حروف على الأقل.')
    if (f.password !== f.confirm) return setError('كلمتا السر مش متطابقتين.')
    setBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: { data: { full_name: f.name.trim() }, emailRedirectTo: `${location.origin}/auth/callback` }
    })
    if (error) { setError(arabicError(error.message)); setBusy(false); return }
    if (data.session) { router.replace('/dashboard'); router.refresh(); return }
    setInfo('وصلتك رسالة على بريدك. افتحها وأكد الحساب، وبعدين سجّل دخول.')
    setBusy(false)
  }

  return (
    <AuthShell title="حساب جديد" subtitle="سجّل مرة واحدة وبعدها بتدخل بحسابك">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">الاسم بالكامل</label>
          <input id="name" required className="input" value={f.name} onChange={set('name')} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">البريد الإلكتروني</label>
          <input id="email" type="email" required dir="ltr" className="input" value={f.email} onChange={set('email')} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">كلمة السر (8 حروف على الأقل)</label>
          <input id="password" type="password" required dir="ltr" className="input" value={f.password} onChange={set('password')} autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">تأكيد كلمة السر</label>
          <input id="confirm" type="password" required dir="ltr" className="input" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" />
        </div>
        {error && <p className="alert-error" role="alert">{error}</p>}
        {info && <p className="alert-ok" role="status">{info}</p>}
        <button className="btn btn-red" disabled={busy}>{busy ? 'جاري الإنشاء...' : 'إنشاء الحساب'}</button>
        <p className="text-center text-sm">عندك حساب؟ <Link href="/login" className="font-bold underline">سجّل دخول</Link></p>
      </form>
    </AuthShell>
  )
}
