import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

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

export interface PushPayload {
  title: string
  body: string
  url?: string
}

async function sendToSubscription(
  supabase: SupabaseClient,
  row: { user_id: string; endpoint: string; subscription: unknown },
  payload: PushPayload,
) {
  try {
    await webpush.sendNotification(
      row.subscription as webpush.PushSubscription,
      JSON.stringify(payload),
    )
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode
    console.error('[push] send failed', { endpoint: row.endpoint.slice(0, 60), status })
    if (status === 410 || status === 404) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', row.user_id)
        .eq('endpoint', row.endpoint)
    }
  }
}

export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
) {
  if (!vapidConfigured) return

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .eq('user_id', userId)

  if (error) { console.error('[push] db error', error); return }
  if (!subs?.length) { console.log('[push] no subscriptions for', userId); return }

  await Promise.allSettled(
    subs.map((row) => sendToSubscription(supabase, { ...row, user_id: userId }, payload))
  )
}

export async function sendPushToAll(
  supabase: SupabaseClient,
  payload: PushPayload,
) {
  if (!vapidConfigured) return

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, subscription')

  if (error) { console.error('[push] db error', error); return }
  if (!subs?.length) return

  await Promise.allSettled(
    subs.map((row) => sendToSubscription(supabase, row, payload))
  )
}
