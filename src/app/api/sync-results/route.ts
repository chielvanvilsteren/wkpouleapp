/**
 * POST /api/sync-results
 *
 * Toegang via:
 * 1. Authorization: Bearer <SYNC_SECRET_TOKEN>  — voor cronjobs
 * 2. Ingelogde admin-sessie (Supabase cookie)   — voor de admin UI knop
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SYNC_SECRET_TOKEN = process.env.SYNC_SECRET_TOKEN
const WK_COMPETITION_ID = 2000
const LOOKBACK_HOURS = 3
const WK_START = new Date('2026-06-11T00:00:00Z')

// Wedstrijdtijden in de DB zijn Nederlandse tijd (CEST = UTC+2)
const CEST_OFFSET_HOURS = 2

// Venster waarbinnen een uitslag verwacht wordt na aftrap (in minuten)
const WINDOW_MIN_MINUTES = 2 * 60        // 2 uur na aftrap (vroegst)
const WINDOW_MAX_MINUTES = 4.5 * 60     // 4,5 uur na aftrap (uiterst voor herpoging)

interface ApiMatch {
  id: number
  status: string
  homeTeam: { name: string }
  awayTeam: { name: string }
  score: {
    fullTime: { home: number | null; away: number | null }
  }
}

interface DbMatch {
  id: number
  match_number: number
  external_api_id: number | null
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  is_finished: boolean
}

const TEAM_NAME_MAP: Record<string, string> = {
  'Netherlands': 'Nederland', 'Germany': 'Duitsland', 'France': 'Frankrijk',
  'Spain': 'Spanje', 'Belgium': 'België', 'England': 'Engeland',
  'Switzerland': 'Zwitserland', 'Sweden': 'Zweden', 'Norway': 'Noorwegen',
  'Austria': 'Oostenrijk', 'Croatia': 'Kroatië', 'Tunisia': 'Tunesië',
  'Morocco': 'Marokko', 'Japan': 'Japan', 'South Korea': 'Zuid-Korea',
  'Australia': 'Australië', 'New Zealand': 'Nieuw-Zeeland',
  'USA': 'USA', 'United States': 'USA', 'Brazil': 'Brazilië',
  'Argentina': 'Argentinië', 'Colombia': 'Colombia', 'Uruguay': 'Uruguay',
  'Paraguay': 'Paraguay', 'Ecuador': 'Ecuador', 'Saudi Arabia': 'Saudi-Arabië',
  'Iraq': 'Irak', 'Iran': 'Iran', 'Jordan': 'Jordanië', 'Qatar': 'Qatar',
  'South Africa': 'Zuid-Afrika', 'Ivory Coast': 'Ivoorkust',
  "Côte d'Ivoire": 'Ivoorkust', 'Ghana': 'Ghana', 'Algeria': 'Algerije',
  'DR Congo': 'Congo', 'Congo DR': 'Congo', 'Cape Verde': 'Kaapverdië',
  'Egypt': 'Egypte', 'Uzbekistan': 'Oezbekistan',
  'Bosnia and Herzegovina': 'Bosnië', 'Bosnia Herzegovina': 'Bosnië',
  'Czech Republic': 'Tsjechië', 'Czechia': 'Tsjechië',
  'Scotland': 'Schotland', 'Haiti': 'Haïti', 'Panama': 'Panama',
  'Turkey': 'Turkije', 'Curaçao': 'Curaçao', 'Curacao': 'Curaçao',
}

function normalizeTeam(name: string): string {
  return TEAM_NAME_MAP[name] ?? name
}

export async function POST(req: NextRequest) {
  // Auth: accepteer SYNC_SECRET_TOKEN (cronjob) OF ingelogde admin (browser)
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.replace('Bearer ', '').trim()

  let isAuthorized = false
  let triggeredBy = 'cron'

  if (SYNC_SECRET_TOKEN && bearerToken === SYNC_SECRET_TOKEN) {
    isAuthorized = true
  } else {
    // Controleer Supabase admin-sessie
    try {
      const supabaseUser = await createClient()
      const { data: { user } } = await supabaseUser.auth.getUser()
      if (user) {
        const { data: profile } = await supabaseUser.from('profiles').select('is_admin').eq('id', user.id).single()
        if (profile?.is_admin) { isAuthorized = true; triggeredBy = 'admin' }
      }
    } catch {
      // sessie check mislukt → niet geautoriseerd
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Niet geautoriseerd. Log in als admin of gebruik een geldig sync-token.' }, { status: 401 })
  }

  if (!FOOTBALL_DATA_API_KEY) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY is niet geconfigureerd op de server.' }, { status: 500 })
  }

  const supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const results: string[] = []
  const log = (msg: string) => { console.log(msg); results.push(msg) }
  const warn = (msg: string) => { console.warn(msg); results.push(`WARN: ${msg}`) }

  // ── Smart window check (alleen voor automatische cronjob) ──────────────────
  // Als de aanroep van een cronjob komt, controleer of er een wedstrijd is
  // die 2-4,5 uur geleden is begonnen en nog niet afgerond is.
  // Zo niet → sla over zonder DB-log (vermijd ruis in de berichtenlijst).
  if (triggeredBy === 'cron') {
    const isDaily = req.nextUrl.searchParams.get('source') === 'daily'

    // Dagelijkse check is alleen relevant vóór het WK
    if (isDaily && Date.now() >= WK_START.getTime()) {
      return NextResponse.json({ skipped: true, message: 'WK is begonnen — dagelijkse check niet meer actief.' })
    }
    const { data: pendingMatches } = await supabase
      .from('matches')
      .select('match_date, match_time')
      .eq('is_finished', false)
      .not('match_time', 'is', null)

    const nowMs = Date.now()
    const inWindow = (pendingMatches ?? []).some((m) => {
      // Combineer datum + tijd in CEST → UTC
      const kickoffCest = new Date(`${m.match_date}T${m.match_time}`)
      const kickoffUtc = kickoffCest.getTime() - CEST_OFFSET_HOURS * 60 * 60 * 1000
      const minutesAgo = (nowMs - kickoffUtc) / 60_000
      return minutesAgo >= WINDOW_MIN_MINUTES && minutesAgo <= WINDOW_MAX_MINUTES
    })

    if (!inWindow) {
      return NextResponse.json({ skipped: true, message: 'Geen wedstrijd in het synchronisatievenster (2-4,5u na aftrap).' })
    }
  }

  const writeLog = async (status: 'success' | 'none' | 'error', message: string, updated = 0, skipped = 0, unmatched = 0) => {
    await supabase.from('sync_logs').insert({
      status,
      message,
      updated,
      skipped,
      unmatched,
      details: results,
      triggered_by: triggeredBy,
    })
  }

  try {
    // Haal afgeronde wedstrijden op
    const now = new Date()
    const from = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000)
    const dateFrom = from.toISOString().split('T')[0]
    const dateTo = now.toISOString().split('T')[0]

    const apiRes = await fetch(
      `https://api.football-data.org/v4/competitions/${WK_COMPETITION_ID}/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY } }
    )

    if (!apiRes.ok) {
      const body = await apiRes.text()
      const msg = `Football-Data API fout: ${apiRes.status} ${body}`
      await writeLog('error', msg)
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await apiRes.json()
    const apiMatches: ApiMatch[] = (data.matches ?? []).filter((m: ApiMatch) => m.status === 'FINISHED')

    if (apiMatches.length === 0) {
      const msg = 'Geen afgeronde wedstrijden gevonden in de afgelopen 3 uur. De wedstrijd is mogelijk nog bezig of de uitslag is nog niet beschikbaar in de API.'
      await writeLog('none', msg)
      return NextResponse.json({ updated: 0, skipped: 0, unmatched: 0, message: msg, log: results })
    }

    log(`${apiMatches.length} afgeronde wedstrijden van API`)

    // Haal te updaten DB wedstrijden op
    const apiIds = apiMatches.map((m) => m.id)
    const { data: dbRaw, error: dbErr } = await supabase
      .from('matches')
      .select('id, match_number, external_api_id, home_team, away_team, home_score, away_score, is_finished')
      .or(`is_finished.eq.false,external_api_id.in.(${apiIds.join(',')})`)

    if (dbErr) throw new Error(dbErr.message)
    const dbMatches = (dbRaw ?? []) as DbMatch[]

    let updated = 0, skipped = 0, unmatched = 0

    for (const apiMatch of apiMatches) {
      const homeApi = normalizeTeam(apiMatch.homeTeam.name)
      const awayApi = normalizeTeam(apiMatch.awayTeam.name)
      const homeScore = apiMatch.score.fullTime.home
      const awayScore = apiMatch.score.fullTime.away

      if (homeScore === null || awayScore === null) { skipped++; continue }

      let dbMatch = dbMatches.find((m) => m.external_api_id === apiMatch.id)
      if (!dbMatch) {
        dbMatch = dbMatches.find((m) =>
          normalizeTeam(m.home_team) === homeApi && normalizeTeam(m.away_team) === awayApi
        )
      }

      if (!dbMatch) {
        warn(`Niet gekoppeld: ${homeApi} - ${awayApi} (API id: ${apiMatch.id})`)
        unmatched++
        continue
      }

      // Idempotentie
      if (dbMatch.is_finished && dbMatch.home_score === homeScore && dbMatch.away_score === awayScore && dbMatch.external_api_id === apiMatch.id) {
        skipped++
        continue
      }

      const { error: upErr } = await supabase
        .from('matches')
        .update({ home_score: homeScore, away_score: awayScore, is_finished: true, external_api_id: apiMatch.id })
        .eq('id', dbMatch.id)

      if (upErr) { warn(`Update mislukt #${dbMatch.match_number}: ${upErr.message}`); continue }

      log(`✅ #${dbMatch.match_number} ${dbMatch.home_team} ${homeScore}-${awayScore} ${dbMatch.away_team}`)
      updated++
    }

    const summary = `Klaar: ${updated} bijgewerkt, ${skipped} overgeslagen, ${unmatched} niet gekoppeld`
    log(summary)

    await writeLog('success', summary, updated, skipped, unmatched)
    return NextResponse.json({ updated, skipped, unmatched, log: results })
  } catch (err) {
    console.error('Sync fout:', err)
    await writeLog('error', String(err))
    return NextResponse.json({ error: String(err), log: results }, { status: 500 })
  }
}
