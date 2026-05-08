import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vapidOk = !!(
    process.env.VAPID_EMAIL &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  )

  if (!vapidOk) {
    return NextResponse.json({ error: 'VAPID env vars missing', vapidOk })
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .eq('user_id', user.id)

  if (!subs?.length) {
    return NextResponse.json({ error: 'Geen subscriptions gevonden voor jouw account', userId: user.id })
  }

  const results = await Promise.all(
    subs.map(async (row) => {
      try {
        const res = await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          JSON.stringify({ title: '🧪 Test', body: 'Push werkt!', url: '/' }),
        )
        return { endpoint: row.endpoint.slice(0, 50), status: res.statusCode, ok: true }
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string; body?: string }
        return { endpoint: row.endpoint.slice(0, 50), status: e.statusCode, message: e.message, body: e.body, ok: false }
      }
    })
  )

  return NextResponse.json({ vapidOk, userId: user.id, subscriptions: subs.length, results })
}
