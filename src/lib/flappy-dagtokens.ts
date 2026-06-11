import { createClient as createServiceClient } from '@supabase/supabase-js'
import { flappyPredictionTokens } from '@/lib/scoring-utils'
import { hostMatchDates } from '@/lib/wk-dagscore'

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

export async function getFlappyDagtokens(userIds: string[]) {
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
  const tokens = new Map<string, number>()

  for (const prediction of (predictionsRaw ?? []) as DailyPrediction[]) {
    const match = matchMap.get(prediction.match_id)
    if (!match) continue
    tokens.set(
      prediction.user_id,
      (tokens.get(prediction.user_id) ?? 0) + flappyPredictionTokens(prediction, match),
    )
  }

  return tokens
}
