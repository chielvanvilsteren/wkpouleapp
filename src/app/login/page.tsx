'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/mijn-voorspelling'
  const urlError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    urlError === 'link_verlopen' ? 'De wachtwoord-resetlink is verlopen. Vraag hieronder een nieuwe aan.' : null
  )
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showReset, setShowReset] = useState(urlError === 'link_verlopen')

  const handleReset = async () => {
    if (!email) { setError('Vul je e-mailadres in om een resetlink te ontvangen.'); return }
    setResetLoading(true)
    setError(null)
    const supabase = createClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback`,
    })
    if (error) { setError(error.message) } else { setResetSent(true) }
    setResetLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Ongeldig e-mailadres of wachtwoord.'
        : error.message
      )
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🇳🇱</div>
        <h1 className="text-3xl font-bold text-knvb-500">Inloggen</h1>
        <p className="text-gray-600 mt-2">Log in om je voorspelling in te vullen</p>
      </div>

      <div className="card">
        {resetSent ? (
          <div className="bg-green-50 border border-green-300 text-green-800 px-5 py-4 rounded-xl text-center font-medium">
            ✅ Resetlink verstuurd! Controleer je inbox.
          </div>
        ) : showReset ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Vul je e-mailadres in. Je ontvangt een link om je wachtwoord te wijzigen.</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="jouw@email.nl"
              autoComplete="email"
            />
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}
            <button onClick={handleReset} disabled={resetLoading} className="btn-primary w-full">
              {resetLoading ? 'Versturen...' : 'Resetlink versturen'}
            </button>
            <button onClick={() => { setShowReset(false); setError(null) }} className="text-sm text-gray-500 hover:underline w-full text-center">
              Terug naar inloggen
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-field"
                placeholder="jouw@email.nl"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Inloggen...' : 'Inloggen'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setShowReset(true); setError(null) }}
                className="text-sm text-oranje-500 hover:underline"
              >
                Wachtwoord vergeten?
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          Nog geen account?{' '}
          <Link href="/register" className="text-oranje-500 font-semibold hover:underline">
            Aanmelden
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
