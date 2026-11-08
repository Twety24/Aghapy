import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'
import RegisterSW from '@/components/RegisterSW'
import { LangProvider } from '@/components/LangProvider'
import { getLang } from '@/lib/lang'

const plex = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400', '500', '700'], variable: '--font-plex' })
export const metadata = { title: 'Aghapy Team', description: 'Aghapy Team attendance and communication', manifest: '/manifest.json', icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' } }
export const viewport = { themeColor: '#10265a', width: 'device-width', initialScale: 1 }
const themeScript = `try{var t=localStorage.getItem('theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){ }`
export default async function RootLayout({ children }) {
  const lang = await getLang()
  return <html lang={lang} dir={lang === 'en' ? 'ltr' : 'rtl'} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body className={`${plex.variable} font-sans antialiased`}><LangProvider lang={lang}>{children}</LangProvider><RegisterSW /></body></html>
}
