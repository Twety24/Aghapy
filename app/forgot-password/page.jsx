'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { arabicError } from '@/lib/errors'
import AuthShell from '@/components/AuthShell'

export default function ForgotPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`
    })
    setBusy(false)
    if (error) return setError(arabicError(error.message))
    setSent(true)
  }

  return (
    <AuthShell title="استعادة كلمة السر" subtitle="هنبعتلك لينك على بريدك تختار منه كلمة سر جديدة">
      {sent ? (
        <p className="alert-ok" role="status">لو البريد ده مسجّل عندنا، هيوصلك لينك الاستعادة خلال دقايق.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">البريد الإلكتروني</label>
            <input id="email" type="email" required dir="ltr" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="alert-error" role="alert">{error}</p>}
          <button className="btn btn-navy" disabled={busy}>{busy ? 'جاري الإرسال...' : 'ابعت اللينك'}</button>
        </form>
      )}
      <p className="mt-4 text-center text-sm"><Link href="/login" className="underline">رجوع لتسجيل الدخول</Link></p>
    </AuthShell>
  )
}
