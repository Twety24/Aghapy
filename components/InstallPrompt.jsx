'use client'

import { useEffect, useState } from 'react'

const DISMISS_KEY = 'aghapy-install-dismissed-until'
const WEEK = 7 * 24 * 60 * 60 * 1000

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null)
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)
  const [lang, setLang] = useState('ar')

  useEffect(() => {
    const language = document.documentElement.lang === 'en' ? 'en' : 'ar'
    setLang(language)

    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (standalone) return

    try {
      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0)
      if (dismissedUntil > Date.now()) return
    } catch {}

    const userAgent = window.navigator.userAgent || ''
    const isIOS = /iphone|ipad|ipod/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIos(isIOS)

    const show = () => setVisible(true)
    const handleBeforeInstall = event => {
      event.preventDefault()
      setInstallEvent(event)
      show()
    }
    const handleInstalled = () => {
      setVisible(false)
      setInstallEvent(null)
      try { localStorage.removeItem(DISMISS_KEY) } catch {}
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)

    if (isIOS) show()

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + WEEK)) } catch {}
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
    setVisible(false)
  }

  if (!visible) return null

  const copy = lang === 'en'
    ? {
        title: 'Install Aghapy Team',
        body: 'Add the app to your home screen for quicker access.',
        install: 'Install app',
        close: 'Not now',
        ios: 'On your iPhone or iPad, tap Share, then choose “Add to Home Screen”.',
        understood: 'Got it'
      }
    : {
        title: 'ثبّت تطبيق Aghapy Team',
        body: 'أضف التطبيق إلى الشاشة الرئيسية للوصول إليه بسهولة.',
        install: 'تثبيت التطبيق',
        close: 'ليس الآن',
        ios: 'على iPhone أو iPad اضغط على «مشاركة»، ثم اختر «إضافة إلى الشاشة الرئيسية».',
        understood: 'حسنًا'
      }

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-md rounded-2xl border border-navy/10 bg-white p-4 text-navy shadow-2xl ring-1 ring-navy/10" dir={lang === 'en' ? 'ltr' : 'rtl'} aria-label={copy.title}>
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">{copy.title}</h2>
          <p className="mt-1 text-sm text-navy/70">{ios ? copy.ios : copy.body}</p>
        </div>
        <button type="button" onClick={dismiss} className="rounded-lg px-2 py-1 text-xl leading-none text-navy/60 hover:bg-ice" aria-label={copy.close}>×</button>
      </div>
      <div className="mt-3 flex gap-2">
        {installEvent && !ios
          ? <button type="button" onClick={install} className="btn btn-red flex-1">{copy.install}</button>
          : <button type="button" onClick={dismiss} className="btn btn-navy flex-1">{copy.understood}</button>}
        <button type="button" onClick={dismiss} className="btn flex-1 border border-navy/15 bg-white text-navy hover:bg-ice">{copy.close}</button>
      </div>
    </aside>
  )
}
