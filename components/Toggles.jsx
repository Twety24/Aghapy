'use client'
import { useT } from '@/components/LangProvider'
export default function Toggles({ className = '' }) {
  const { lang, setLang } = useT()
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch {}
  }
  return <div className={`flex items-center gap-2 ${className}`}>
    <button type="button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="rounded-lg border border-current/30 px-2 py-1 text-xs font-bold" aria-label="Change language">{lang === 'ar' ? 'EN' : 'عربي'}</button>
    <button type="button" onClick={toggleTheme} className="rounded-lg border border-current/30 px-2 py-1 text-xs" aria-label="Toggle dark mode">◐</button>
  </div>
}
