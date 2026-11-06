import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'
import RegisterSW from '@/components/RegisterSW'

const plex = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400', '500', '700'], variable: '--font-plex' })

export const metadata = {
  title: 'فريق أغابي',
  description: 'حضور وإدارة فريق أغابي',
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'أغابي', statusBarStyle: 'default' }
}
export const viewport = { themeColor: '#10265a', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${plex.variable} font-sans antialiased`}>
        {children}
        <RegisterSW />
      </body>
    </html>
  )
}
