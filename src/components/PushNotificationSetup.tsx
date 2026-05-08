'use client'

import { useEffect, useState } from 'react'

function urlB64ToUint8Array(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)))
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

async function subscribeUser() {
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  })

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  })
}

type State = 'hidden' | 'prompt' | 'ios-not-installed'

export default function PushNotificationSetup() {
  const [state, setState] = useState<State>('hidden')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'granted') {
      // Already granted — subscribe silently (re-registers if needed)
      subscribeUser().catch(() => {})
      return
    }
    if (Notification.permission === 'denied') return
    if (localStorage.getItem('push-dismissed')) return

    const ios = isIOS()

    if (ios && !isStandalone()) {
      // iOS but not installed as PWA — can't do push
      return
    }

    // Show prompt banner
    setState('prompt')
  }, [])

  if (state === 'hidden') return null

  if (state === 'ios-not-installed') {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-knvb-500 text-white rounded-2xl p-4 shadow-2xl flex gap-3 items-start">
        <span className="text-2xl">📲</span>
        <div className="flex-1">
          <p className="font-bold text-sm">Installeer de app voor notificaties</p>
          <p className="text-white/70 text-xs mt-0.5">Tik op Delen → Zet op beginscherm, open dan de app.</p>
        </div>
        <button onClick={() => { localStorage.setItem('push-dismissed', '1'); setState('hidden') }} className="text-white/50 text-xl leading-none">×</button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-knvb-500 text-white rounded-2xl p-4 shadow-2xl flex gap-3 items-center">
      <span className="text-2xl">🔔</span>
      <div className="flex-1">
        <p className="font-bold text-sm">Blijf op de hoogte</p>
        <p className="text-white/70 text-xs mt-0.5">Ontvang meldingen bij nieuwe scores en credits.</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => { localStorage.setItem('push-dismissed', '1'); setState('hidden') }}
          className="text-white/50 text-sm px-2 py-1"
        >
          Nee
        </button>
        <button
          onClick={async () => {
            setState('hidden')
            try {
              const perm = await Notification.requestPermission()
              if (perm === 'granted') await subscribeUser()
            } catch { /* ignore */ }
          }}
          className="bg-oranje-500 hover:bg-oranje-400 text-white text-sm font-bold px-4 py-1.5 rounded-xl"
        >
          Ja!
        </button>
      </div>
    </div>
  )
}
