import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Finaceira Pro - Métricas & Performance',
  description: 'Dashboard financeiro premium com foco em performance e custo de vida.',
}

import { AuthGate } from '@/components/auth/AuthGate'
import { AuthProvider } from '@/context/AuthContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-velvet-deep text-silver-polished" suppressHydrationWarning>
        <AuthProvider>
          <AuthGate>
            {children}
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  )
}
