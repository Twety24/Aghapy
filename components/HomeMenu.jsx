'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/components/LangProvider'
import { usePathname } from 'next/navigation'
import FeatureIcon from '@/components/FeatureIcon'
export default function HomeMenu({ links, signOut }) {
  const { t } = useT()
  const pathname = usePathname()
  const icons = {'/scan':'scan','/messages':'notifications','/photos':'photos','/meeting':'meeting','/excuse':'excuse','/spiritual-journal':'spiritual','/chats':'chats','/profile':'profile','/admin':'admin'}
  const [open,setOpen]=useState(false)
  return <><button onClick={()=>setOpen(true)} aria-label={t('common.menu')} className="rounded-lg p-2 transition hover:bg-white/10 active:scale-95"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>{open&&<div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true"><button className="flex-1 bg-black/40 backdrop-blur-[2px]" onClick={()=>setOpen(false)} aria-label={t('common.close')}/><div className="order-first flex w-72 max-w-[82%] flex-col overflow-y-auto rounded-e-3xl bg-white p-4 text-navy shadow-2xl animate-menu-in"><div className="mb-4 flex items-center justify-between"><span className="font-black tracking-wide">AGHAPY <span className="text-[#8a78ad]">TEAM</span></span><button onClick={()=>setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-ice">{t('common.close')}</button></div><nav className="flex flex-col gap-1">{links.map(([href,key])=><Link key={href} href={href} onClick={()=>setOpen(false)} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition active:scale-[.98] ${pathname===href?'bg-[#eae4f5] text-[#604b85] shadow-sm':'text-[#52617a] hover:bg-white'}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/80"><FeatureIcon name={icons[href]||'notifications'} className="h-5 w-5" /></span>{t(key)}</Link>)}</nav><form action={signOut} className="mt-auto pt-5"><button className="w-full rounded-2xl bg-[#8b405c] px-4 py-3 text-center font-bold text-white transition hover:bg-[#71334b] active:scale-[.98]">{t('common.logout')}</button></form></div></div>}</>
}