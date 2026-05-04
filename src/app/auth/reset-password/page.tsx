'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase stuurt bij een hash-gebaseerde flow (#access_token=...) de tokens via de hash.
  // De client-side SDK pakt die automatisch op via onAuthStateChange.
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })
    // Check meteen of er al een sessie is (via callback route)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens bevatten.')
      return
    }
    if (password !== confirm) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/mijn-voorspelling'), 2500)
  }

  if (!sessionReady) {
    return (
      <div className="text-center text-gray-500 py-8">
        Sessie laden...
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-300 text-green-800 px-5 py-4 rounded-xl text-center font-medium">
        ✅ Wachtwoord gewijzigd! Je wordt doorgestuurd…
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Nieuw wachtwoord
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="input-field"
          placeholder="Minimaal 8 tekens"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
          Herhaal wachtwoord
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className="input-field"
          placeholder="Herhaal nieuw wachtwoord"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Opslaan...' : 'Wachtwoord opslaan'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🔑</div>
        <h1 className="text-3xl font-bold text-knvb-500">Nieuw wachtwoord</h1>
        <p className="text-gray-600 mt-2">Kies een nieuw wachtwoord voor je account.</p>
      </div>
      <div className="card">
        <Suspense fallback={<div className="text-center text-gray-500 py-8">Laden...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
