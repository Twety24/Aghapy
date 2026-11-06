import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function signOut() {
  'use server'
  await (await createClient()).auth.signOut()
  redirect('/login')
}

export default async function Dashboard() {
  const supabase = (await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, role, is_active').eq('id', user.id).single()
  const { count: unread } = await supabase
    .from('message_recipients').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).is('read_at', null)

  if (profile && !profile.is_active) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="alert-error">الحساب ده موقوف. كلّم المسؤول.</p>
        <form action={signOut}><button className="btn btn-navy">تسجيل الخروج</button></form>
      </main>
    )
  }

  const first = (profile?.full_name || '').split(' ')[0]

  return (
    <div className="min-h-dvh bg-ice">
      <header className="bg-navy px-5 pb-10 pt-5 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white p-1"><Image src="/logo.jpg" alt="" width={44} height={44} /></span>
            <div>
              <p className="text-sm text-sky">أهلاً بيك</p>
              <p className="text-lg font-bold">{first}</p>
            </div>
          </div>
          <form action={signOut}><button className="rounded-lg px-3 py-2 text-sm text-sky ring-1 ring-sky/40 hover:bg-white/10">خروج</button></form>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-md space-y-4 px-5 pb-10">
        <Link href="/scan" className="block rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-navy/10 hover:ring-navy/30">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-stage ring-8 ring-stage/15">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></svg>
          </div>
          <h2 className="mt-4 text-xl font-bold">تسجيل الحضور</h2>
          <p className="mt-1 text-sm text-navy/70">امسح كود الاجتماع. السبت من 6 لـ 11 مساءً.</p>
        </Link>

        <Link href="/messages" className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/10 hover:ring-navy/30">
          <span className="text-lg font-bold">الرسائل</span>
          {unread > 0 ? <span className="rounded-full bg-stage px-3 py-1 text-sm font-bold text-white">{unread} جديدة</span> : <span className="text-sm text-navy/50">مفيش جديد</span>}
        </Link>

        <Link href="/suggestions" className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/10 hover:ring-navy/30">
          <span className="text-lg font-bold">المقترحات</span>
          <span className="text-sm text-navy/50">ابعت فكرتك</span>
        </Link>
        {profile?.role === 'admin' && (
          <Link href="/admin/attendance" className="flex items-center justify-between rounded-2xl bg-navy p-5 text-white shadow-sm">
            <span className="text-lg font-bold">جلسة الحضور (أدمن)</span>
            <span className="text-sm text-sky">QR والحضور</span>
          </Link>
        )}
      </main>
    </div>
  )
}
