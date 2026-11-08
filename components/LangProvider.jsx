'use client'
import { createContext, useContext, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { tFor } from '@/lib/i18n'
const Context = createContext({ lang: 'ar', t: tFor('ar') })
export function LangProvider({ lang, children }) {
  const router = useRouter()
  const value = useMemo(() => ({ lang, t: tFor(lang), setLang(next) { document.cookie = `lang=${next};path=/;max-age=31536000;samesite=lax`; router.refresh() } }), [lang, router])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export const useT = () => useContext(Context)
