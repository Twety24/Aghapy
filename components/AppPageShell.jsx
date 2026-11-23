import Link from 'next/link'
import FeatureIcon from '@/components/FeatureIcon'

const themes = {
  blue: 'from-[#142b5a] via-[#263f78] to-[#5479a8]',
  violet: 'from-[#2d234d] via-[#59447a] to-[#8a70a8]',
  rose: 'from-[#542b45] via-[#8a4560] to-[#bd7890]',
  gold: 'from-[#4c3925] via-[#80613b] to-[#b58a55]',
  teal: 'from-[#173f46] via-[#28636a] to-[#66a0a0]'
}

export default function AppPageShell({ title, eyebrow = 'AGHAPY', description, icon = 'notifications', theme = 'blue', children, wide = false }) {
  return (
    <main className={`mx-auto min-h-dvh ${wide ? 'max-w-5xl' : 'max-w-3xl'} bg-[#f7f8fc] px-4 pb-12 pt-5 text-[#1d2b49] sm:px-6`}>
      <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#61708d] transition hover:bg-white hover:text-[#1d2b49]">
        <span aria-hidden="true">←</span> رجوع
      </Link>
      <header className={`relative mt-3 overflow-hidden rounded-[2rem] bg-gradient-to-br ${themes[theme] || themes.blue} p-6 text-white shadow-xl sm:p-8`}>
        <div className="pointer-events-none absolute -left-12 -top-14 h-44 w-44 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-52 w-52 rounded-full border-[26px] border-white/5" />
        <div className="relative flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[.24em] text-white/65">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{title}</h1>
            {description && <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">{description}</p>}
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-inner">
            <FeatureIcon name={icon} className="h-7 w-7" />
          </span>
        </div>
      </header>
      <div className="mt-5 space-y-4">{children}</div>
    </main>
  )
}
