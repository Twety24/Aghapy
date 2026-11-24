import Link from 'next/link'
import FeatureIcon from '@/components/FeatureIcon'

const themes = {
  blue: 'from-navy via-[#1b3974] to-stage',
  violet: 'from-navy via-[#1b3974] to-stage',
  rose: 'from-navy via-[#1b3974] to-stage',
  gold: 'from-navy via-[#1b3974] to-stage',
  teal: 'from-navy via-[#1b3974] to-stage'
}

export default function AppPageShell({ title, eyebrow = 'AGHAPY', description, icon = 'notifications', theme = 'blue', children, wide = false, backLabel = 'رجوع' }) {
  return (
    <main className={`mx-auto min-h-dvh ${wide ? 'max-w-5xl' : 'max-w-3xl'} bg-ice px-4 pb-12 pt-5 text-navy sm:px-6`}>
      <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-navy/65 transition hover:bg-white hover:text-stage">
        <span aria-hidden="true">←</span> {backLabel}
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
