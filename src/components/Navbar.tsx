'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/auth/actions'
import type { Profile } from '@/types'

type Props = {
  user: { id: string; email?: string } | null
  profile: Profile | null
}

export default function Navbar({ user, profile }: Props) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
  }

  return (
    <nav className="bg-knvb-500 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-oranje-400 text-2xl">🇳🇱</span>
            <span>Oranje Pool WK 2026</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/ranglijst"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/ranglijst')
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              Ranglijst
            </Link>

            {user ? (
              <>
                <Link
                  href="/mijn-voorspelling"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/mijn-voorspelling')
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Mijn Voorspelling
                </Link>

                {profile?.is_admin && (
                  <Link
                    href="/admin"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin')
                        ? 'bg-oranje-400 text-white'
                        : 'text-oranje-300 hover:bg-white/10 hover:text-oranje-200'
                    }`}
                  >
                    Admin
                  </Link>
                )}

                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
                  <span className="text-sm text-white/70">{profile?.display_name}</span>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {loggingOut ? 'Uitloggen...' : 'Uitloggen'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link
                  href="/login"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Inloggen
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-oranje-500 hover:bg-oranje-600 text-white transition-colors"
                >
                  Aanmelden
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 space-y-1">
            <Link href="/ranglijst" className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10" onClick={() => setMenuOpen(false)}>
              Ranglijst
            </Link>
            {user ? (
              <>
                <Link href="/mijn-voorspelling" className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                  Mijn Voorspelling
                </Link>
                {profile?.is_admin && (
                  <Link href="/admin" className="block px-3 py-2 rounded-lg text-sm text-oranje-300 hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                    Admin
                  </Link>
                )}
                <div className="px-3 py-2 text-sm text-white/60">{profile?.display_name}</div>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 disabled:opacity-50"
                >
                  Uitloggen
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                  Inloggen
                </Link>
                <Link href="/register" className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                  Aanmelden
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
