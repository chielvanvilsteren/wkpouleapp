import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WK 2026 Oranje Pool',
  description: 'Voorspel de WK 2026 selectie, basis XI en incidenten van Oranje',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isDisplay = pathname.startsWith('/display')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user && !isDisplay) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data as Profile | null
  }

  return (
    <html lang="nl">
      <body className={inter.className}>
        {!isDisplay && <Navbar user={user} profile={profile} />}
        <main className={isDisplay ? '' : 'min-h-screen'}>
          {children}
        </main>
        {!isDisplay && (
          <footer className="bg-knvb-500 text-white/60 text-center text-xs py-4 mt-16">
            WK 2026 Oranje Pool &middot; Veel succes! 🇳🇱
          </footer>
        )}
      </body>
    </html>
  )
}
