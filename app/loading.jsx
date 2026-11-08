import Image from 'next/image'
export default function Loading(){return <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ice"><Image src="/logo.jpg" alt="Aghapy Team" width={112} height={112} priority className="brand-logo logo-loading"/><p className="text-sm font-bold text-navy/70">Aghapy Team</p></main>}
