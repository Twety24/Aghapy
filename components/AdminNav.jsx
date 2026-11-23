'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/components/LangProvider'
import FeatureIcon from '@/components/FeatureIcon'
const links = [['/admin','nav.overview','admin'],['/admin/attendance','nav.attendance','scan'],['/admin/members','nav.members','profile'],['/admin/groups','nav.groups','chats'],['/admin/meeting','nav.meeting','meeting'],['/admin/messages','nav.messages','notifications'],['/admin/spiritual-journal','nav.suggestions','spiritual'],['/admin/reports','nav.reports','photos'],['/admin/photos','nav.photos','photos'],['/admin/settings','nav.settings','excuse']]
export default function AdminNav() {
  const path = usePathname()
  const { t } = useT()
  return <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:flex-col md:overflow-visible">
    {links.map(([href,key,icon]) => {
      const on = href === '/admin' ? path === href : path.startsWith(href)
      return <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${on ? 'bg-white text-[#263d70] shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${on?'bg-[#eee8f7] text-[#72549a]':'bg-white/10 text-white'}`}><FeatureIcon name={icon} className="h-5 w-5"/></span>{t(key)}</Link>
    })}
    <Link href="/dashboard" className="mt-1 flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white md:mt-4">← {t('nav.app')}</Link>
  </nav>
}
