'use client'

import { useEffect, useState } from 'react'

function urlB64ToUint8Array(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)))
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

async function subscribeUser() {
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return true
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  })
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  })
  return res.ok
}

type State = 'hidden' | 'prompt'

export default function PushNotificationSetup() {
  const [state, setState] = useState<State>('hidden')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return
    if (localStorage.getItem('push-dismissed')) return

    if (Notification.permission === 'granted') {
      subscribeUser().catch(() => {})
      return
    }

    // iOS needs standalone mode for push
    if (isIOS() && !isStandalone()) return

    setState('prompt')
  }, [])

  if (state === 'hidden') return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { localStorage.setItem('push-dismissed', '1'); setState('hidden') }} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl p-6 pb-10">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="text-6xl">🔔</div>

          <div>
            <h2 className="text-xl font-black text-gray-900">Blijf op de hoogte</h2>
            <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
              Ontvang een melding zodra je nieuwe Flappy Bal credits krijgt of jouw poule score is bijgewerkt.
            </p>
          </div>

          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              try {
                const perm = await Notification.requestPermission()
                if (perm === 'granted') await subscribeUser()
              } catch { /* ignore */ }
              setState('hidden')
              setLoading(false)
            }}
            className="w-full max-w-xs bg-knvb-500 hover:bg-knvb-600 disabled:opacity-50 text-white font-black text-lg py-4 rounded-2xl transition-colors"
          >
            {loading ? 'Even geduld…' : '🔔 Zet notificaties aan'}
          </button>

          <button
            onClick={() => { localStorage.setItem('push-dismissed', '1'); setState('hidden') }}
            className="text-gray-400 text-sm"
          >
            Nee, liever niet
          </button>
        </div>
      </div>
    </>
  )
}
