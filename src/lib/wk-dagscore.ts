import { createClient as createServiceClient } from '@supabase/supabase-js'
import { matchPredictionPoints } from '@/lib/scoring-utils'

const HOST_TIME_ZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Mexico_City',
  'America/Toronto',
  'America/Vancouver',
]

function dateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function hostMatchDates(date = new Date()) {
  return Array.from(new Set(HOST_TIME_ZONES.map((timeZone) => dateInTimeZone(date, timeZone))))
}

type DailyMatch = {
  id: number
  home_score: number | null
  away_score: number | null
}

type DailyPrediction = {
  user_id: string
  match_id: number
  home_score: number
  away_score: number
}

export async function getWkDagscores(userIds: string[]) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || userIds.length === 0) return new Map<string, number>()

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false } },
  )

  const { data: matchesRaw } = await admin
    .from('matches')
    .select('id, home_score, away_score')
    .eq('is_finished', true)
    .in('match_date', hostMatchDates())

  const matches = (matchesRaw ?? []) as DailyMatch[]
  if (matches.length === 0) return new Map<string, number>()

  const { data: predictionsRaw } = await admin
    .from('match_predictions')
    .select('user_id, match_id, home_score, away_score')
    .in('user_id', userIds)
    .in('match_id', matches.map((match) => match.id))

  const matchMap = new Map(matches.map((match) => [match.id, match]))
  const points = new Map<string, number>()

  for (const prediction of (predictionsRaw ?? []) as DailyPrediction[]) {
    const match = matchMap.get(prediction.match_id)
    if (!match) continue
    points.set(
      prediction.user_id,
      (points.get(prediction.user_id) ?? 0) + matchPredictionPoints(prediction, match),
    )
  }

  return points
}
