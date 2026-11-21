import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/guard'
import { getLang } from '@/lib/lang'
import { tFor } from '@/lib/i18n'
import AdminNav from '@/components/AdminNav'
import Toggles from '@/components/Toggles'

export default async function AdminLayout({ children }) {
  const context = await getAdminContext()
  if (!context) redirect('/dashboard')
  const lang = await getLang()
  const t = tFor(lang)
  return (
    <div className="min-h-dvh bg-ice md:flex">
      <aside className="bg-navy text-white md:min-h-dvh md:w-60 md:shrink-0">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white p-1"><Image src="/logo.jpg" alt="" width={40} height={40} className="brand-logo" /></span>
            <span className="font-bold">{lang === 'en' ? 'Administration' : 'لوحة الأدمن'}</span>
          </div>
          <Toggles className="text-sky" />
        </div>
        <AdminNav />
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  )
}
