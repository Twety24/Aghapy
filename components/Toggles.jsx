'use client'
import { useState } from 'react'
import { useT } from '@/components/LangProvider'

export default function Toggles({ className = '' }) {
  const { lang, setLang } = useT()
  const [theme, setTheme] = useState(() => typeof document === 'undefined' ? 'light' : document.documentElement.dataset.theme || 'light')

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setTheme(next)
    try {
      localStorage.setItem('theme', next)
    } catch {}
  }

  return (
    <div className={`flex shrink-0 items-center gap-2 sm:gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        className="inline-flex min-h-14 min-w-24 items-center justify-center rounded-xl border border-current/30 px-5 py-3 text-base font-bold transition hover:bg-current/10 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        {lang === 'ar' ? 'EN' : 'عربي'}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex min-h-14 min-w-14 items-center justify-center rounded-xl border border-current/30 px-4 py-3 text-2xl transition hover:bg-current/10 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>
      </button>
    </div>
  )
}
