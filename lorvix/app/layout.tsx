import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SwRegister } from '@/components/SwRegister'

export const viewport: Viewport = {
  themeColor: '#5C0018',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: { default: 'Lorvix', template: '%s | Lorvix' },
  description: 'Sistema de agendamento inteligente com IA no WhatsApp 24h.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Lorvix',
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <SwRegister />
        {children}
      </body>
    </html>
  )
}
