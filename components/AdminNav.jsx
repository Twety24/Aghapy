'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [['/admin', 'نظرة عامة'], ['/admin/attendance', 'الحضور'], ['/admin/reports', 'التقارير'], ['/admin/members', 'الأعضاء'], ['/admin/messages', 'الرسائل'], ['/admin/suggestions', 'المقترحات'], ['/admin/settings', 'الإعدادات']]

export default function AdminNav() {
  const p = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
      {links.map(([h, l]) => {
        const on = h === '/admin' ? p === h : p.startsWith(h)
        return <Link key={h} href={h} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${on ? 'bg-white text-navy' : 'text-sky hover:bg-white/10'}`}>{l}</Link>
      })}
      <Link href="/dashboard" className="whitespace-nowrap rounded-lg px-4 py-2 text-sm text-sky/80 hover:bg-white/10 md:mt-4">← التطبيق</Link>
    </nav>
  )
}
