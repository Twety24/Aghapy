'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { arabicError } from '@/lib/errors'
import AuthShell from '@/components/AuthShell'

export default function ResetPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('كلمة السر لازم تكون 8 حروف على الأقل.')
    if (password !== confirm) return setError('كلمتا السر مش متطابقتين.')
    setBusy(true)
    const { error } = await createClient().auth.updateUser({ password })
    if (error) { setError(arabicError(error.message)); setBusy(false); return }
    router.replace('/dashboard'); router.refresh()
  }

  return (
    <AuthShell title="كلمة سر جديدة">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="p1">كلمة السر الجديدة</label>
          <input id="p1" type="password" required dir="ltr" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="p2">تأكيد كلمة السر</label>
          <input id="p2" type="password" required dir="ltr" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        {error && <p className="alert-error" role="alert">{error}</p>}
        <button className="btn btn-red" disabled={busy}>{busy ? 'جاري الحفظ...' : 'حفظ'}</button>
      </form>
    </AuthShell>
  )
}
