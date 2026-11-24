import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/guard'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }) {
  const context = await getAdminContext()
  if (!context) redirect('/dashboard')
  return (
    <div className="min-h-dvh bg-ice md:flex">
      <aside className="relative bg-gradient-to-b from-navy via-[#1b3974] to-stage text-white shadow-xl md:min-h-dvh md:w-64 md:shrink-0">
        <div className="flex items-center gap-3 border-b border-white/10 p-5">
          <span className="rounded-xl bg-white p-1"><Image src="/logo.jpg" alt="" width={40} height={40} className="brand-logo" /></span>
          <span><span className="block text-[10px] font-black tracking-[.22em] text-white/50">AGHAPY TEAM</span><span className="mt-1 block font-black">لوحة الإدارة</span></span>
        </div>
        <AdminNav />
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  )
}
