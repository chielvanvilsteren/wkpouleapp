import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const vapidConfigured =
  process.env.VAPID_EMAIL &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
} else {
  console.warn('[push] VAPID env vars missing — push notifications disabled')
}

const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

export interface PushPayload {
  title: string
  body: string
  url?: string
}

async function send(
  sub: { user_id?: string; endpoint: string; subscription: unknown },
  payload: PushPayload,
) {
  try {
    await webpush.sendNotification(
      sub.subscription as webpush.PushSubscription,
      JSON.stringify(payload),
    )
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode
    console.error('[push] send failed', { endpoint: sub.endpoint, status, err })
    if (status === 410 || status === 404) {
      // Subscription expired — clean up
      const q = admin().from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      if (sub.user_id) q.eq('user_id', sub.user_id)
      await q
    }
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!vapidConfigured) return
  const { data: subs, error } = await admin()
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .eq('user_id', userId)
  if (error) { console.error('[push] db error', error); return }
  if (!subs?.length) { console.log('[push] no subscriptions for', userId); return }

  await Promise.allSettled(subs.map((row) => send({ ...row, user_id: userId }, payload)))
}

export async function sendPushToAll(payload: PushPayload) {
  if (!vapidConfigured) return
  const { data: subs, error } = await admin()
    .from('push_subscriptions')
    .select('user_id, endpoint, subscription')
  if (error) { console.error('[push] db error', error); return }
  if (!subs?.length) return

  await Promise.allSettled(subs.map((row) => send(row, payload)))
}
