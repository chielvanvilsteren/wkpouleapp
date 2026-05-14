import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: scores, error } = await supabase
    .from('flappy_scores')
    .select('user_id, score, played_at')
    .order('played_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!scores || scores.length === 0) {
    return NextResponse.json({
      total_games: 0,
      total_players: 0,
      highscores: [],
      score_distribution: [],
      modal_score: null,
      mean_score: null,
      most_improved: [],
      most_consistent: [],
      lowest_score: null,
    })
  }

  const userIds = Array.from(new Set(scores.map(s => s.user_id)))

  const [{ data: profiles }, { data: creditLog }] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', userIds),
    supabase.from('flappy_credit_log').select('user_id').in('user_id', userIds),
  ])

  const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name ?? 'Onbekend']))
  const creditCountMap = new Map<string, number>()
  for (const row of creditLog ?? []) {
    creditCountMap.set(row.user_id, (creditCountMap.get(row.user_id) ?? 0) + 1)
  }

  type UserStat = {
    user_id: string
    display_name: string
    games_played: number
    best_score: number
    first_score: number
    avg_score: number
  }

  const byUser = new Map<string, { scores: number[]; firstScore: number }>()
  for (const s of scores) {
    if (!byUser.has(s.user_id)) {
      byUser.set(s.user_id, { scores: [], firstScore: s.score })
    }
    byUser.get(s.user_id)!.scores.push(s.score)
  }

  const userStats: UserStat[] = Array.from(byUser.entries()).map(([uid, { scores: sc, firstScore }]) => ({
    user_id: uid,
    display_name: nameMap.get(uid) ?? 'Onbekend',
    games_played: creditCountMap.get(uid) ?? sc.length,
    best_score: Math.max(...sc),
    first_score: firstScore,
    avg_score: Math.round(sc.reduce((a, b) => a + b, 0) / sc.length),
  }))

  const highscores = [...userStats]
    .sort((a, b) => b.best_score - a.best_score || a.games_played - b.games_played)
    .slice(0, 10)
    .map(({ display_name, best_score, games_played }) => ({ display_name, best_score, games_played }))

  const most_improved = [...userStats]
    .filter(s => s.games_played >= 2)
    .map(s => ({ ...s, improvement: s.best_score - s.first_score }))
    .sort((a, b) => b.improvement - a.improvement || b.best_score - a.best_score)
    .slice(0, 5)
    .map(({ display_name, first_score, best_score, improvement }) => ({ display_name, first_score, best_score, improvement }))

  const most_consistent = [...userStats]
    .filter(s => s.games_played >= 3)
    .sort((a, b) => b.avg_score - a.avg_score || b.games_played - a.games_played)
    .slice(0, 5)
    .map(({ display_name, avg_score, games_played, best_score }) => ({ display_name, avg_score, games_played, best_score }))

  const lowestEntry = scores.reduce((min, s) => s.score < min.score ? s : min, scores[0])
  const lowest_score = {
    display_name: nameMap.get(lowestEntry.user_id) ?? 'Onbekend',
    score: lowestEntry.score,
    played_at: lowestEntry.played_at,
  }

  // Score distribution: dynamic bucket size based on score range
  const allScores = scores.map(s => s.score)
  const minScore = Math.min(...allScores)
  const maxScore = Math.max(...allScores)
  const mean_score = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)

  const range = maxScore - minScore
  const bucketSize = range <= 20 ? 1 : range <= 50 ? 5 : range <= 200 ? 10 : 25
  const bucketCount = Math.min(20, Math.ceil((range + 1) / bucketSize))
  const buckets: { label: string; from: number; to: number; count: number }[] = []

  for (let i = 0; i < bucketCount; i++) {
    const from = minScore + i * bucketSize
    const to = from + bucketSize - 1
    buckets.push({ label: bucketSize === 1 ? String(from) : `${from}–${to}`, from, to, count: 0 })
  }

  for (const s of allScores) {
    const idx = Math.min(Math.floor((s - minScore) / bucketSize), buckets.length - 1)
    buckets[idx].count++
  }

  const peakBucket = buckets.reduce((max, b) => b.count > max.count ? b : max, buckets[0])
  const modal_score = peakBucket.label

  return NextResponse.json({
    total_games: (creditLog ?? []).length || scores.length,
    total_players: userIds.length,
    highscores,
    score_distribution: buckets,
    modal_score,
    mean_score,
    most_improved,
    most_consistent,
    lowest_score,
  })
}
