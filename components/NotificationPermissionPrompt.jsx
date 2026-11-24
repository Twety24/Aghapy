'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const VAPID_PUBLIC_KEY = 'BDozZL50pViHY-jyvt6KbIp7L6mSgwB-HcyIpm1M0iY2RQJL64skkyEoioOAktZj5jlMbCshhgnEeMUSZ3x2LtE'

function decodeKey(value) {
  const padded = value + '='.repeat((4 - value.length % 4) % 4)
  return Uint8Array.from(atob(padded.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0))
}

export default function NotificationPermissionPrompt({ userId }) {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [lang, setLang] = useState('ar')

  useEffect(() => {
    setLang(document.documentElement.lang === 'en' ? 'en' : 'ar')
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => {
        setEnabled(Boolean(sub))
      }).catch(() => setEnabled(false))
    }
  }, [])

  const copy = lang === 'en' ? {
    title: 'Device notifications',
    body: 'Enable notifications to receive important Aghapy updates even when the app is closed.',
    enable: 'Enable notifications',
    disable: 'Turn off on this device',
    enabled: 'Notifications are enabled on this device.',
    unsupported: 'This browser does not support push notifications.',
    install: 'On iPhone and iPad, install Aghapy Team on your Home Screen first, then open the installed app.',
    denied: 'Notifications are blocked in browser settings. Allow them for this site, then try again.',
    failed: 'Could not update notifications. Check your connection and try again.',
    saving: 'Please wait...'
  } : {
    title: 'إشعارات الجهاز',
    body: 'فعّل الإشعارات عشان توصلك تنبيهات Aghapy المهمة حتى لو التطبيق مقفول.',
    enable: 'تفعيل الإشعارات',
    disable: 'إيقاف الإشعارات على هذا الجهاز',
    enabled: 'الإشعارات مفعّلة على هذا الجهاز.',
    unsupported: 'المتصفح ده مش بيدعم إشعارات Push.',
    install: 'على iPhone وiPad لازم تثبّت Aghapy Team على الشاشة الرئيسية الأول، وبعدها تفتح التطبيق المثبّت.',
    denied: 'إشعارات الموقع مقفولة من إعدادات المتصفح. اسمح بها للموقع ثم حاول مرة أخرى.',
    failed: 'تعذر تحديث الإشعارات. تأكد من الاتصال وحاول مرة أخرى.',
    saving: 'لحظة من فضلك...'
  }

  async function enableNotifications() {
    setBusy(true)
    setMessage('')
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setMessage(copy.unsupported)
        return
      }
      const ua = navigator.userAgent || ''
      const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
      if (ios && !installed) {
        setMessage(copy.install)
        return
      }
      if (Notification.permission === 'denied') {
        setMessage(copy.denied)
        return
      }
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
      if (permission !== 'granted') return

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeKey(VAPID_PUBLIC_KEY)
        })
      }
      const db = createClient()
      const { error } = await db.functions.invoke('aghapy-push', {
        body: { action: 'subscribe', subscription: subscription.toJSON() }
      })
      if (error) throw error
      setEnabled(true)
      setMessage(copy.enabled)
    } catch (error) {
      console.error('Push subscription failed:', error)
      setMessage(copy.failed)
    } finally {
      setBusy(false)
    }
  }

  async function disableNotifications() {
    setBusy(true)
    setMessage('')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const db = createClient()
        const { error } = await db.functions.invoke('aghapy-push', {
          body: { action: 'unsubscribe', endpoint: subscription.endpoint }
        })
        if (error) throw error
        await subscription.unsubscribe()
      }
      setEnabled(false)
    } catch (error) {
      console.error('Push unsubscription failed:', error)
      setMessage(copy.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm ring-1 ring-navy/5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ice text-xl text-navy" aria-hidden="true">♧</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-navy">{copy.title}</h2>
          <p className="mt-1 text-xs leading-6 text-navy/65">{copy.body}</p>
          {enabled && <p className="mt-2 text-xs font-semibold text-green-700">{copy.enabled}</p>}
          {message && <p role="status" className="mt-2 text-xs leading-5 text-stage">{message}</p>}
          <button type="button" disabled={busy} onClick={enabled ? disableNotifications : enableNotifications} className="mt-3 rounded-xl bg-navy px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0c1d45] disabled:opacity-50">
            {busy ? copy.saving : enabled ? copy.disable : copy.enable}
          </button>
        </div>
      </div>
    </section>
  )
}
