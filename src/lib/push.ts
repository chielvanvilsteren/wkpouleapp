import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

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

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const { data: subs } = await admin()
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .eq('user_id', userId)

  if (!subs?.length) return

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          JSON.stringify(payload),
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          await admin()
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', row.endpoint)
        }
      }
    }),
  )
}

export async function sendPushToAll(payload: PushPayload) {
  const { data: subs } = await admin()
    .from('push_subscriptions')
    .select('user_id, endpoint, subscription')

  if (!subs?.length) return

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          JSON.stringify(payload),
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          await admin()
            .from('push_subscriptions')
            .delete()
            .eq('user_id', row.user_id)
            .eq('endpoint', row.endpoint)
        }
      }
    }),
  )
}
