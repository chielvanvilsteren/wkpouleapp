/**
 * Football-Data.org sync script
 *
 * Haalt afgeronde WK-wedstrijden op via de Football-Data.org API
 * en updatet de Supabase `matches` tabel.
 *
 * Gebruik:
 *   npx tsx scripts/sync-match-results.ts
 *
 * Of als cronjob (zie README-sync.md).
 *
 * Omgevingsvariabelen vereist:
 *   FOOTBALL_DATA_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

// ─── Config ──────────────────────────────────────────────────────────────────

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// WK 2026 competition ID op Football-Data.org
// Controleer via: GET https://api.football-data.org/v4/competitions
const WK_COMPETITION_ID = 2000 // FIFA World Cup

// Haal wedstrijden op die in de afgelopen N uur zijn afgelopen
// 2.5 uur na aftrap is de uitslag normaal beschikbaar
const LOOKBACK_HOURS = 3

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiMatch {
  id: number
  utcDate: string
  status: 'TIMED' | 'SCHEDULED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'SUSPENDED' | 'POSTPONED' | 'CANCELLED' | 'AWARDED'
  homeTeam: { id: number; name: string; shortName: string; tla: string }
  awayTeam: { id: number; name: string; shortName: string; tla: string }
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
  }
  stage: string
  group: string | null
}

interface ApiResponse {
  matches: ApiMatch[]
  resultSet: { count: number; first: string; last: string; played: number }
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
  match_date: string
  match_time: string | null
}

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`)
}

function warn(msg: string) {
  console.warn(`[${new Date().toISOString()}] WARN: ${msg}`)
}

function error(msg: string, err?: unknown) {
  console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, err ?? '')
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function fetchFinishedMatches(): Promise<ApiMatch[]> {
  if (!FOOTBALL_DATA_API_KEY) throw new Error('FOOTBALL_DATA_API_KEY niet ingesteld')

  const now = new Date()
  const from = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000)

  // dateFrom/dateTo in YYYY-MM-DD formaat
  const dateFrom = from.toISOString().split('T')[0]
  const dateTo = now.toISOString().split('T')[0]

  const url = `https://api.football-data.org/v4/competitions/${WK_COMPETITION_ID}/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`

  log(`API aanroep: ${url}`)

  const response = await fetch(url, {
    headers: {
      'X-Auth-Token': FOOTBALL_DATA_API_KEY,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`API fout ${response.status}: ${body}`)
  }

  const data: ApiResponse = await response.json()
  log(`API: ${data.resultSet.count} wedstrijden gevonden (${data.resultSet.played} gespeeld)`)

  return data.matches.filter((m) => m.status === 'FINISHED')
}

// ─── Match koppeling: API-team naam → onze DB naam ────────────────────────────
// Football-Data.org gebruikt Engelse teamnamen; pas aan waar nodig.

const TEAM_NAME_MAP: Record<string, string> = {
  'Netherlands': 'Nederland',
  'Germany': 'Duitsland',
  'France': 'Frankrijk',
  'Spain': 'Spanje',
  'Belgium': 'België',
  'England': 'Engeland',
  'Switzerland': 'Zwitserland',
  'Sweden': 'Zweden',
  'Norway': 'Noorwegen',
  'Austria': 'Oostenrijk',
  'Portugal': 'Portugal',
  'Croatia': 'Kroatië',
  'Denmark': 'Denemarken',
  'Tunisia': 'Tunesië',
  'Morocco': 'Marokko',
  'Senegal': 'Senegal',
  'Japan': 'Japan',
  'South Korea': 'Zuid-Korea',
  'Australia': 'Australië',
  'New Zealand': 'Nieuw-Zeeland',
  'USA': 'USA',
  'United States': 'USA',
  'Mexico': 'Mexico',
  'Canada': 'Canada',
  'Brazil': 'Brazilië',
  'Argentina': 'Argentinië',
  'Colombia': 'Colombia',
  'Uruguay': 'Uruguay',
  'Paraguay': 'Paraguay',
  'Ecuador': 'Ecuador',
  'Saudi Arabia': 'Saudi-Arabië',
  'Iraq': 'Irak',
  'Iran': 'Iran',
  'Jordan': 'Jordanië',
  'Qatar': 'Qatar',
  'South Africa': 'Zuid-Afrika',
  'Ivory Coast': 'Ivoorkust',
  "Côte d'Ivoire": 'Ivoorkust',
  'Ghana': 'Ghana',
  'Algeria': 'Algerije',
  'DR Congo': 'Congo',
  'Congo DR': 'Congo',
  'Cape Verde': 'Kaapverdië',
  'Egypt': 'Egypte',
  'Uzbekistan': 'Oezbekistan',
  'Bosnia and Herzegovina': 'Bosnië',
  'Bosnia Herzegovina': 'Bosnië',
  'Czech Republic': 'Tsjechië',
  'Czechia': 'Tsjechië',
  'Scotland': 'Schotland',
  'Haiti': 'Haïti',
  'Panama': 'Panama',
  'Turkey': 'Turkije',
  'Curaçao': 'Curaçao',
  'Curacao': 'Curaçao',
  'Serbia': 'Servië',
}

function normalizeTeamName(apiName: string): string {
  return TEAM_NAME_MAP[apiName] ?? apiName
}

// ─── Hoofd sync logica ────────────────────────────────────────────────────────

async function syncResults() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase omgevingsvariabelen niet ingesteld')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  log('=== Start sync ===')

  // 1. Haal afgeronde wedstrijden op van de API
  let apiMatches: ApiMatch[]
  try {
    apiMatches = await fetchFinishedMatches()
  } catch (err) {
    error('API ophalen mislukt', err)
    process.exit(1)
  }

  if (apiMatches.length === 0) {
    log('Geen afgeronde wedstrijden gevonden in dit tijdvenster. Klaar.')
    return
  }

  // 2. Haal alle DB-wedstrijden op die nog niet afgerond zijn
  //    OF al gekoppeld zijn aan een external_api_id (voor correcties)
  const apiIds = apiMatches.map((m) => m.id)

  const { data: dbMatches, error: dbError } = await supabase
    .from('matches')
    .select('id, match_number, external_api_id, home_team, away_team, home_score, away_score, is_finished, match_date, match_time')
    .or(`is_finished.eq.false,external_api_id.in.(${apiIds.join(',')})`)

  if (dbError) {
    error('Database ophalen mislukt', dbError)
    process.exit(1)
  }

  const matches = (dbMatches ?? []) as DbMatch[]
  log(`DB: ${matches.length} wedstrijden geladen om te vergelijken`)

  // 3. Koppel API-wedstrijden aan DB-wedstrijden
  let updated = 0
  let skipped = 0
  let unmatched = 0

  for (const apiMatch of apiMatches) {
    const homeApi = normalizeTeamName(apiMatch.homeTeam.name)
    const awayApi = normalizeTeamName(apiMatch.awayTeam.name)
    const homeScore = apiMatch.score.fullTime.home
    const awayScore = apiMatch.score.fullTime.away

    if (homeScore === null || awayScore === null) {
      warn(`Wedstrijd ${apiMatch.id} (${homeApi} - ${awayApi}) heeft geen score, overgeslagen`)
      skipped++
      continue
    }

    // Zoek eerst op external_api_id (meest betrouwbaar na eerste koppeling)
    let dbMatch = matches.find((m) => m.external_api_id === apiMatch.id)

    // Fallback: match op teamnamen
    if (!dbMatch) {
      dbMatch = matches.find(
        (m) =>
          normalizeTeamName(m.home_team) === homeApi &&
          normalizeTeamName(m.away_team) === awayApi
      )
      // Probeer ook omgekeerd (API soms andere volgorde)
      if (!dbMatch) {
        dbMatch = matches.find(
          (m) =>
            normalizeTeamName(m.home_team) === awayApi &&
            normalizeTeamName(m.away_team) === homeApi
        )
        if (dbMatch) {
          warn(`Wedstrijd ${apiMatch.id} gekoppeld met omgekeerde teamvolgorde: ${dbMatch.home_team} - ${dbMatch.away_team}`)
        }
      }
    }

    if (!dbMatch) {
      warn(`Geen DB-match gevonden voor: ${homeApi} - ${awayApi} (API id: ${apiMatch.id})`)
      unmatched++
      continue
    }

    // Idempotentie: sla over als score al identiek is én al afgerond
    if (
      dbMatch.is_finished &&
      dbMatch.home_score === homeScore &&
      dbMatch.away_score === awayScore &&
      dbMatch.external_api_id === apiMatch.id
    ) {
      log(`Overgeslagen (ongewijzigd): #${dbMatch.match_number} ${dbMatch.home_team} ${homeScore}-${awayScore} ${dbMatch.away_team}`)
      skipped++
      continue
    }

    // Update de wedstrijd
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        is_finished: true,
        external_api_id: apiMatch.id,
      })
      .eq('id', dbMatch.id)

    if (updateError) {
      error(`Update mislukt voor wedstrijd #${dbMatch.match_number}: ${updateError.message}`)
      continue
    }

    log(`✅ Bijgewerkt: #${dbMatch.match_number} ${dbMatch.home_team} ${homeScore}-${awayScore} ${dbMatch.away_team}`)
    updated++
  }

  log(`=== Sync klaar: ${updated} bijgewerkt, ${skipped} overgeslagen, ${unmatched} niet gekoppeld ===`)

  // 4. Als er updates waren, herbereken de scores
  if (updated > 0) {
    log('Scores herberekenen...')
    const recalcUrl = process.env.NEXT_PUBLIC_APP_URL
    if (recalcUrl) {
      try {
        const res = await fetch(`${recalcUrl}/api/wk-scores/recalculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SYNC_SECRET_TOKEN ?? ''}`,
          },
        })
        if (res.ok) {
          log('Scores herberekend via API')
        } else {
          warn(`Score herberekening via API mislukt: ${res.status}`)
        }
      } catch (err) {
        warn('Score herberekening via API kon niet worden bereikt. Handmatig uitvoeren.')
      }
    } else {
      log('NEXT_PUBLIC_APP_URL niet ingesteld — scores moeten handmatig herberekend worden')
    }
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

syncResults().catch((err) => {
  error('Onverwachte fout', err)
  process.exit(1)
})
