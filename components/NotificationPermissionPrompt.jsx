'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const VAPID_PUBLIC_KEY = 'BDozZL50pViHY-jyvt6KbIp7L6mSgwB-HcyIpm1M0iY2RQJL64skkyEoioOAktZj5jlMbCshhgnEeMUSZ3x2LtE'

function decodeKey(value) {
  const padded = value + '='.repeat((4 - value.length % 4) % 4)
  return Uint8Array.from(atob(padded.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0))
}

export default function NotificationPermissionPrompt({ userId }) {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [lang, setLang] = useState('ar')

  const copy = lang === 'en' ? {
    title: 'Stay updated with Aghapy',
    body: 'Allow notifications to receive important updates from Aghapy Team.',
    allow: 'Allow',
    decline: 'No, thanks',
    failed: 'Your choice was saved, but notifications could not be enabled.',
    saving: 'Please wait...'
  } : {
    title: 'خليك متابع Aghapy',
    body: 'اسمح بالإشعارات عشان توصلك التحديثات والتنبيهات المهمة من Aghapy Team.',
    allow: 'سماح',
    decline: 'لا، شكرًا',
    failed: 'تم حفظ اختيارك، لكن تعذر تفعيل الإشعارات.',
    saving: 'لحظة من فضلك...'
  }

  useEffect(() => {
    setLang(document.documentElement.lang === 'en' ? 'en' : 'ar')
    let active = true
    async function checkChoice() {
      const db = createClient()
      const { data, error } = await db.from('notification_preferences').select('choice_made_at').eq('user_id', userId).maybeSingle()
      if (!active) return
      if (!error && data?.choice_made_at) {
        setVisible(false)
        return
      }
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          if (subscription) {
            await db.from('notification_preferences').upsert({
              user_id: userId,
              device_notifications_enabled: true,
              choice_made_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            if (active) setVisible(false)
            return
          }
        } catch {}
      }
      if (active && !error) setVisible(true)
    }
    checkChoice()
    return () => { active = false }
  }, [userId])

  async function saveChoice(enabled) {
    const db = createClient()
    const now = new Date().toISOString()
    const { error } = await db.from('notification_preferences').upsert({
      user_id: userId,
      device_notifications_enabled: enabled,
      choice_made_at: now,
      updated_at: now
    }, { onConflict: 'user_id' })
    if (error) throw error
  }

  async function declineNotifications() {
    setBusy(true)
    try {
      await saveChoice(false)
      setVisible(false)
    } catch (error) {
      console.error('Could not save notification choice:', error)
      setMessage(copy.failed)
    } finally {
      setBusy(false)
    }
  }

  async function enableNotifications() {
    setBusy(true)
    setMessage('')
    try {
      await saveChoice(false)
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setVisible(false)
        return
      }
      const ua = navigator.userAgent || ''
      const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
      if (ios && !installed) {
        setVisible(false)
        return
      }
      if (Notification.permission === 'denied') {
        setVisible(false)
        return
      }
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
      if (permission !== 'granted') {
        setVisible(false)
        return
      }
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeKey(VAPID_PUBLIC_KEY)
        })
      }
      const { error } = await createClient().functions.invoke('aghapy-push', {
        body: { action: 'subscribe', subscription: subscription.toJSON() }
      })
      if (error) throw error
      await saveChoice(true)
      setVisible(false)
    } catch (error) {
      console.error('Push subscription failed:', error)
      setVisible(false)
      setMessage(copy.failed)
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm ring-1 ring-navy/5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ice text-xl text-navy" aria-hidden="true">♧</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-navy">{copy.title}</h2>
          <p className="mt-1 text-xs leading-6 text-navy/65">{copy.body}</p>
          {message && <p role="status" className="mt-2 text-xs leading-5 text-stage">{message}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={enableNotifications} className="rounded-xl bg-navy px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0c1d45] disabled:opacity-50">{busy ? copy.saving : copy.allow}</button>
            <button type="button" disabled={busy} onClick={declineNotifications} className="rounded-xl border border-navy/15 px-4 py-2.5 text-xs font-bold text-navy disabled:opacity-50">{copy.decline}</button>
          </div>
        </div>
      </div>
    </section>
  )
}
