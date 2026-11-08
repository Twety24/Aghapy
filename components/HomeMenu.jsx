'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/components/LangProvider'
export default function HomeMenu({ links }) {
  const { t } = useT()
  const [open,setOpen]=useState(false)
  return <><button onClick={()=>setOpen(true)} aria-label={t('common.menu')} className="rounded-lg p-2 hover:bg-white/10"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>{open&&<div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true"><div className="w-72 max-w-[80%] overflow-y-auto bg-white p-4 text-navy shadow-xl"><button onClick={()=>setOpen(false)} className="mb-2 text-sm underline">{t('common.close')}</button><nav className="flex flex-col gap-1">{links.map(([href,key])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="rounded-lg px-3 py-3 font-medium hover:bg-ice">{t(key)}</Link>)}</nav></div><button className="flex-1 bg-black/40" onClick={()=>setOpen(false)} aria-label={t('common.close')}/></div>}</>
}
