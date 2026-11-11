'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/components/LangProvider'
const links = [['/admin','nav.overview'],['/admin/attendance','nav.attendance'],['/admin/members','nav.members'],['/admin/groups','nav.groups'],['/admin/meeting','nav.meeting'],['/admin/messages','nav.messages'],['/admin/suggestions','nav.suggestions'],['/admin/reports','nav.reports'],['/admin/photos','nav.photos'],['/admin/settings','nav.settings']]
export default function AdminNav() {
  const path = usePathname()
  const { t } = useT()
  return <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
    {links.map(([href,key]) => {
      const on = href === '/admin' ? path === href : path.startsWith(href)
      return <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${on ? 'bg-white text-navy' : 'text-sky hover:bg-white/10'}`}>{t(key)}</Link>
    })}
    <Link href="/dashboard" className="whitespace-nowrap rounded-lg px-4 py-2 text-sm text-sky/80 hover:bg-white/10 md:mt-4">← {t('nav.app')}</Link>
  </nav>
}
