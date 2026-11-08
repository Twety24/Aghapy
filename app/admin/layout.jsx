import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/guard'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }) {
  if (!(await getAdmin())) redirect('/dashboard')
  return (
    <div className="min-h-dvh bg-ice md:flex">
      <aside className="bg-navy text-white md:min-h-dvh md:w-60 md:shrink-0">
        <div className="flex items-center gap-3 p-4">
          <span className="rounded-xl bg-white p-1"><Image src="/logo.jpg" alt="" width={40} height={40} className="brand-logo" /></span>
          <span className="font-bold">لوحة الأدمن</span>
        </div>
        <AdminNav />
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  )
}
