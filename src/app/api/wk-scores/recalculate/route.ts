import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types'
import { normalize, matchResult } from '@/lib/scoring-utils'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { data: finishedMatches },
    { data: allPredictions },
    { data: wkUitslag },
    { data: wkIncidents },
  ] = await Promise.all([
    admin.from('matches').select('*').eq('is_finished', true),
    admin.from('match_predictions').select('*'),
    admin.from('wk_incidents_uitslag').select('*').eq('id', 1).single(),
    admin.from('wk_incidents_predictions').select('*'),
  ])

  if (!finishedMatches || !allPredictions || !wkIncidents) {
    return NextResponse.json({ message: 'Geen data om te berekenen.' })
  }

  // Build match result map
  const matchResultMap = new Map(
    finishedMatches.map((m) => [
      m.id,
      { home: m.home_score!, away: m.away_score!, result: matchResult(m.home_score!, m.away_score!) },
    ])
  )

  // Group predictions by user
  const predsByUser = new Map<string, typeof allPredictions>()
  for (const p of allPredictions) {
    const list = predsByUser.get(p.user_id) ?? []
    list.push(p)
    predsByUser.set(p.user_id, list)
  }

  // Calculate match points per user
  const matchPointsMap = new Map<string, number>()
  for (const [userId, preds] of Array.from(predsByUser.entries())) {
    let pts = 0
    for (const pred of preds) {
      const actual = matchResultMap.get(pred.match_id)
      if (!actual) continue
      if (pred.home_score === actual.home && pred.away_score === actual.away) {
        pts += 3 // exact score
      } else if (matchResult(pred.home_score, pred.away_score) === actual.result) {
        pts += 1 // correct result
      }
    }
    matchPointsMap.set(userId, pts)
  }

  // Calculate incidents + topscorer per user
  const upsertData = wkIncidents.map((inc) => {
    const matchPts = matchPointsMap.get(inc.user_id) ?? 0

    let incidentsPts = 0
    let topscorerPts = 0

    if (wkUitslag) {
      if (normalize(inc.rode_kaart) === normalize(wkUitslag.rode_kaart) && normalize(wkUitslag.rode_kaart) !== '') incidentsPts += 10
      if (normalize(inc.gele_kaart) === normalize(wkUitslag.gele_kaart) && normalize(wkUitslag.gele_kaart) !== '') incidentsPts += 10
      if (normalize(inc.geblesseerde) === normalize(wkUitslag.geblesseerde) && normalize(wkUitslag.geblesseerde) !== '') incidentsPts += 10
      if (normalize(inc.eerste_goal_nl) === normalize(wkUitslag.eerste_goal_nl) && normalize(wkUitslag.eerste_goal_nl) !== '') incidentsPts += 10
      if (normalize(inc.topscorer_wk) === normalize(wkUitslag.topscorer_wk) && normalize(wkUitslag.topscorer_wk) !== '') topscorerPts = 20
    }

    return {
      user_id: inc.user_id,
      match_punten: matchPts,
      incidents_punten: incidentsPts,
      topscorer_punten: topscorerPts,
      totaal: matchPts + incidentsPts + topscorerPts,
      updated_at: new Date().toISOString(),
    }
  })

  // Also include users with match predictions but no incidents
  for (const [userId, matchPts] of Array.from(matchPointsMap.entries())) {
    if (!upsertData.find((u) => u.user_id === userId)) {
      upsertData.push({
        user_id: userId,
        match_punten: matchPts,
        incidents_punten: 0,
        topscorer_punten: 0,
        totaal: matchPts,
        updated_at: new Date().toISOString(),
      })
    }
  }

  if (upsertData.length === 0) {
    return NextResponse.json({ message: 'Geen voorspellingen om te berekenen.' })
  }

  const { error } = await admin.from('wk_scores').upsert(upsertData, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: `WK scores berekend voor ${upsertData.length} deelnemers.`, count: upsertData.length })
}
