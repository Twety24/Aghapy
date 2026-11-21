'use client'
import { useT } from '@/components/LangProvider'
export default function Toggles({ className = '' }) {
  const { lang, setLang } = useT()
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch {}
  }
  const isDark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
  return <div className={`flex items-center gap-3 ${className}`}>
    <button type="button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-xl border border-current/30 px-4 py-2 text-sm font-bold transition hover:bg-current/10 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}>{lang === 'ar' ? 'EN' : 'عربي'}</button>
    <button type="button" onClick={toggleTheme} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-current/30 px-3 py-2 text-lg transition hover:bg-current/10 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} title={isDark ? 'Light mode' : 'Dark mode'}><span aria-hidden="true">{isDark ? '☀' : '◐'}</span></button>
  </div>
}
