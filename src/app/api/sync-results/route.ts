/**
 * POST /api/sync-results
 *
 * Toegang via:
 * 1. Authorization: Bearer <SYNC_SECRET_TOKEN>  — voor cronjobs
 * 2. Ingelogde admin-sessie (Supabase cookie)   — voor de admin UI knop
 */

import { createClient as createApiClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SYNC_SECRET_TOKEN = process.env.SYNC_SECRET_TOKEN
const WK_COMPETITION_ID = 2000
const LOOKBACK_HOURS = 3
const ADMIN_LOOKBACK_HOURS = 48
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

type SupabaseLikeError = {
  message: string
  code?: string
  status?: number
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

function describeSupabaseError(context: string, err: SupabaseLikeError): string {
  const rawMessage = err.message || 'Onbekende Supabase fout'
  const isApiKeyError = rawMessage.toLowerCase().includes('invalid api key')

  if (isApiKeyError) return `${context}: Supabase configuratiefout: NEXT_PUBLIC_SUPABASE_ANON_KEY is ongeldig of hoort niet bij NEXT_PUBLIC_SUPABASE_URL.`

  const details = [
    rawMessage,
    err.code ? `code ${err.code}` : null,
    err.status ? `status ${err.status}` : null,
  ].filter(Boolean).join(' · ')

  return `${context}: ${details}`
}

export async function POST(req: NextRequest) {
  // Auth: accepteer SYNC_SECRET_TOKEN (cronjob) OF ingelogde admin (browser)
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.replace('Bearer ', '').trim()

  let isAuthorized = false
  let triggeredBy = 'cron'
  let userScopedSupabase: Awaited<ReturnType<typeof createClient>> | null = null

  if (SYNC_SECRET_TOKEN && bearerToken === SYNC_SECRET_TOKEN) {
    isAuthorized = true
  } else {
    // Controleer Supabase admin-sessie
    try {
      const supabaseUser = await createClient()
      userScopedSupabase = supabaseUser
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

  if (triggeredBy === 'cron' && !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is niet geconfigureerd op de server.' }, { status: 500 })
  }

  const supabase = triggeredBy === 'admin' && userScopedSupabase
    ? userScopedSupabase
    : createApiClient(SUPABASE_URL, SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const results: string[] = []
  const log = (msg: string) => { console.log(msg); results.push(msg) }
  const warn = (msg: string) => { console.warn(msg); results.push(`WARN: ${msg}`) }

  if (triggeredBy === 'admin' && SYNC_SECRET_TOKEN) {
    const { error } = await supabase.rpc('configure_sync_rpc_secret', { p_sync_token: SYNC_SECRET_TOKEN })
    if (error) warn(`Cron-RPC secret kon niet worden ingesteld: ${error.message}`)
  }

  const writeLog = async (status: 'success' | 'none' | 'error', message: string, updated = 0, skipped = 0, unmatched = 0, source = triggeredBy) => {
    if (triggeredBy === 'cron') {
      const { error } = await supabase.rpc('sync_insert_log', {
        p_sync_token: SYNC_SECRET_TOKEN!,
        p_status: status,
        p_message: message,
        p_updated: updated,
        p_skipped: skipped,
        p_unmatched: unmatched,
        p_details: results,
        p_triggered_by: source,
      })
      if (error) warn(`Sync-log opslaan via RPC mislukt: ${error.message}`)
      return
    }

    const { error } = await supabase.from('sync_logs').insert({
      status,
      message,
      updated,
      skipped,
      unmatched,
      details: results,
      triggered_by: source,
    })
    if (error) warn(`Sync-log opslaan mislukt: ${error.message}`)
  }

  const updateMatchResult = async (dbMatch: DbMatch, homeScore: number, awayScore: number, apiMatchId: number) => {
    if (triggeredBy === 'cron') {
      const { error } = await supabase.rpc('sync_update_match_result', {
        p_sync_token: SYNC_SECRET_TOKEN!,
        p_match_id: dbMatch.id,
        p_home_score: homeScore,
        p_away_score: awayScore,
        p_external_api_id: apiMatchId,
      })
      return error
    }

    const { error } = await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore, is_live: false, is_finished: true, external_api_id: apiMatchId })
      .eq('id', dbMatch.id)
    return error
  }

  // ── Heartbeat: dagelijkse controle om 12:00 CEST ─────────────────────────────
  if (triggeredBy === 'cron' && req.nextUrl.searchParams.get('source') === 'heartbeat') {
    const start = Date.now()
    let reachable = false
    let responseMs: number | null = null
    let errorMsg = ''

    try {
      const res = await fetch(
        `https://api.football-data.org/v4/competitions/${WK_COMPETITION_ID}`,
        { headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY! } },
      )
      responseMs = Date.now() - start
      reachable = res.ok
      if (!res.ok) errorMsg = `HTTP ${res.status}`
    } catch (err) {
      responseMs = Date.now() - start
      errorMsg = err instanceof Error ? err.message : 'Onbekende fout'
    }

    const message = reachable
      ? `💓 Dagelijkse controle 12:00 — API bereikbaar (${responseMs}ms)`
      : `💓 Dagelijkse controle 12:00 — API NIET bereikbaar: ${errorMsg}`

    await writeLog(reachable ? 'none' : 'error', message, 0, 0, 0, 'heartbeat')

    return NextResponse.json({ heartbeat: true, reachable, message })
  }

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
      const skipMsg = 'Geen wedstrijd in het synchronisatievenster (2-4,5u na aftrap).'
      // Alleen dagelijkse check logt — zo kan admin zien dat de cron draait.
      // WK-cron (elk half uur) blijft stil om ruis te vermijden.
      if (isDaily) {
        await writeLog('none', skipMsg)
      }
      return NextResponse.json({ skipped: true, message: skipMsg })
    }
  }

  try {
    // Haal afgeronde wedstrijden op
    const now = new Date()
    const lookbackHours = triggeredBy === 'admin' ? ADMIN_LOOKBACK_HOURS : LOOKBACK_HOURS
    const from = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000)
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
      const msg = `Geen afgeronde wedstrijden gevonden in de afgelopen ${lookbackHours} uur. De wedstrijd is mogelijk nog bezig of de uitslag is nog niet beschikbaar in de API.`
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

    if (dbErr) throw new Error(describeSupabaseError('Database ophalen mislukt', dbErr))
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
        if (!dbMatch) {
          dbMatch = dbMatches.find((m) =>
            normalizeTeam(m.home_team) === awayApi && normalizeTeam(m.away_team) === homeApi
          )
          if (dbMatch) {
            warn(`Gekoppeld met omgekeerde teamvolgorde: ${dbMatch.home_team} - ${dbMatch.away_team} (API: ${homeApi} - ${awayApi})`)
          }
        }
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

      const upErr = await updateMatchResult(dbMatch, homeScore, awayScore, apiMatch.id)

      if (upErr) {
        const msg = describeSupabaseError(`Update mislukt #${dbMatch.match_number}`, upErr)
        if (triggeredBy === 'cron') throw new Error(msg)
        warn(msg)
        continue
      }

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
