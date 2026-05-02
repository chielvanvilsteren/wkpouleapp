/**
 * @jest-environment node
 */
import { POST } from '@/app/api/wk-scores/recalculate/route'

const mockSupabaseAuth = { getUser: jest.fn() }
const mockSupabaseFrom = jest.fn()
const mockSupabaseClient = {
  auth: mockSupabaseAuth,
  from: mockSupabaseFrom,
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

const mockAdminFrom = jest.fn()
const mockAdminClient = { from: mockAdminFrom }

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockAdminClient),
}))

// Helper: build a chainable mock for admin queries
function makePromiseChain(resolvedValue: unknown) {
  return jest.fn().mockResolvedValue(resolvedValue)
}

describe('POST /api/wk-scores/recalculate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  })

  it('returns 401 when no user', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await POST()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when user is not admin', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
    })
    const res = await POST()
    expect(res.status).toBe(403)
  })

  function setupAdmin() {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    })
  }

  it('returns 200 with "Geen data" when missing data (no finishedMatches)', async () => {
    setupAdmin()

    // Promise.all: [matches, allPredictions, wkUitslag, wkIncidents]
    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: null, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: [], error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: null, error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toContain('Geen data')
  })

  it('returns 200 "Geen voorspellingen" when empty upsertData', async () => {
    setupAdmin()

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: [], error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 1, topscorer_wk: 'Mbappe' }, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: [], error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toContain('Geen voorspellingen')
  })

  it('awards 3 points for exact score', async () => {
    setupAdmin()

    const finishedMatches = [{ id: 1, home_score: 2, away_score: 1, is_finished: true }]
    const allPredictions = [{ user_id: 'u1', match_id: 1, home_score: 2, away_score: 1 }]
    const wkUitslag = { id: 1, rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }
    const wkIncidents = [{ user_id: 'u1', rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }]

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: finishedMatches, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: allPredictions, error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: wkUitslag, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: wkIncidents, error: null }) }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)
      .mockReturnValueOnce(upsertChain)

    const res = await POST()
    expect(res.status).toBe(200)

    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    const u1 = upsertArg.find((u: { user_id: string }) => u.user_id === 'u1')
    expect(u1.match_punten).toBe(3)
  })

  it('awards 1 point for correct result', async () => {
    setupAdmin()

    const finishedMatches = [{ id: 1, home_score: 3, away_score: 1, is_finished: true }]
    // Predicted 2-0 (home wins, correct result but wrong score)
    const allPredictions = [{ user_id: 'u1', match_id: 1, home_score: 2, away_score: 0 }]
    const wkUitslag = { id: 1, rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }
    const wkIncidents = [{ user_id: 'u1', rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }]

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: finishedMatches, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: allPredictions, error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: wkUitslag, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: wkIncidents, error: null }) }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)
      .mockReturnValueOnce(upsertChain)

    await POST()

    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    const u1 = upsertArg.find((u: { user_id: string }) => u.user_id === 'u1')
    expect(u1.match_punten).toBe(1)
  })

  it('awards 0 points for wrong result', async () => {
    setupAdmin()

    const finishedMatches = [{ id: 1, home_score: 2, away_score: 1, is_finished: true }]
    // Predicted 1-2 (away win, wrong)
    const allPredictions = [{ user_id: 'u1', match_id: 1, home_score: 1, away_score: 2 }]
    const wkUitslag = { id: 1, rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }
    const wkIncidents = [{ user_id: 'u1', rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }]

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: finishedMatches, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: allPredictions, error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: wkUitslag, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: wkIncidents, error: null }) }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)
      .mockReturnValueOnce(upsertChain)

    await POST()

    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    const u1 = upsertArg.find((u: { user_id: string }) => u.user_id === 'u1')
    expect(u1.match_punten).toBe(0)
  })

  it('awards 10 points per correct incident', async () => {
    setupAdmin()

    const finishedMatches: unknown[] = []
    const allPredictions: unknown[] = []
    const wkUitslag = { id: 1, rode_kaart: 'Dumfries', gele_kaart: 'De Jong', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }
    const wkIncidents = [{ user_id: 'u1', rode_kaart: 'Dumfries', gele_kaart: 'De Jong', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }]

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: finishedMatches, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: allPredictions, error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: wkUitslag, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: wkIncidents, error: null }) }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)
      .mockReturnValueOnce(upsertChain)

    await POST()

    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    const u1 = upsertArg.find((u: { user_id: string }) => u.user_id === 'u1')
    expect(u1.incidents_punten).toBe(20) // 2 correct incidents × 10
  })

  it('does not award points for empty string incidents', async () => {
    setupAdmin()

    const finishedMatches: unknown[] = []
    const allPredictions: unknown[] = []
    // All uitslag fields are empty, so even a match would not count
    const wkUitslag = { id: 1, rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }
    const wkIncidents = [{ user_id: 'u1', rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }]

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: finishedMatches, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: allPredictions, error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: wkUitslag, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: wkIncidents, error: null }) }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)
      .mockReturnValueOnce(upsertChain)

    await POST()

    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    const u1 = upsertArg.find((u: { user_id: string }) => u.user_id === 'u1')
    expect(u1.incidents_punten).toBe(0)
  })

  it('awards 20 points for correct topscorer', async () => {
    setupAdmin()

    const finishedMatches: unknown[] = []
    const allPredictions: unknown[] = []
    const wkUitslag = { id: 1, rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: 'Mbappe' }
    const wkIncidents = [{ user_id: 'u1', rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: 'mbappe' }]

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: finishedMatches, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: allPredictions, error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: wkUitslag, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: wkIncidents, error: null }) }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)
      .mockReturnValueOnce(upsertChain)

    await POST()

    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    const u1 = upsertArg.find((u: { user_id: string }) => u.user_id === 'u1')
    expect(u1.topscorer_punten).toBe(20)
  })

  it('includes users with match predictions but no incidents', async () => {
    setupAdmin()

    const finishedMatches = [{ id: 1, home_score: 2, away_score: 1, is_finished: true }]
    // u2 has match prediction but no incidents
    const allPredictions = [
      { user_id: 'u1', match_id: 1, home_score: 2, away_score: 1 },
      { user_id: 'u2', match_id: 1, home_score: 0, away_score: 0 },
    ]
    const wkUitslag = { id: 1, rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }
    // Only u1 has incidents
    const wkIncidents = [{ user_id: 'u1', rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }]

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: finishedMatches, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: allPredictions, error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: wkUitslag, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: wkIncidents, error: null }) }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)
      .mockReturnValueOnce(upsertChain)

    await POST()

    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    const u2 = upsertArg.find((u: { user_id: string }) => u.user_id === 'u2')
    expect(u2).toBeDefined()
    expect(u2.match_punten).toBe(0) // wrong prediction
    expect(u2.incidents_punten).toBe(0)
  })

  it('skips prediction when match not in finishedMatches (actual=undefined)', async () => {
    setupAdmin()
    const finishedMatches = [{ id: 1, home_score: 2, away_score: 1, is_finished: true }]
    // match_id 999 is not finished
    const allPredictions = [{ user_id: 'u1', match_id: 999, home_score: 2, away_score: 1 }]
    const wkUitslag = { id: 1, rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }
    const wkIncidents = [{ user_id: 'u1', rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }]

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: finishedMatches, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: allPredictions, error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: wkUitslag, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: wkIncidents, error: null }) }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)
      .mockReturnValueOnce(upsertChain)

    await POST()
    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    const u1 = upsertArg.find((u: { user_id: string }) => u.user_id === 'u1')
    expect(u1.match_punten).toBe(0)
  })

  it('awards 10 points each for geblesseerde and eerste_goal_nl', async () => {
    setupAdmin()
    const finishedMatches: unknown[] = []
    const allPredictions: unknown[] = []
    const wkUitslag = { id: 1, rode_kaart: '', gele_kaart: '', geblesseerde: 'Van Dijk', eerste_goal_nl: 'Depay', topscorer_wk: '' }
    const wkIncidents = [{ user_id: 'u1', rode_kaart: '', gele_kaart: '', geblesseerde: 'van dijk', eerste_goal_nl: 'depay', topscorer_wk: '' }]

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: finishedMatches, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: allPredictions, error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: wkUitslag, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: wkIncidents, error: null }) }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)
      .mockReturnValueOnce(upsertChain)

    await POST()
    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    const u1 = upsertArg.find((u: { user_id: string }) => u.user_id === 'u1')
    expect(u1.incidents_punten).toBe(20)
  })

  it('returns 500 when upsert fails', async () => {
    setupAdmin()

    const finishedMatches: unknown[] = []
    const allPredictions: unknown[] = []
    const wkUitslag = { id: 1, rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }
    const wkIncidents = [{ user_id: 'u1', rode_kaart: '', gele_kaart: '', geblesseerde: '', eerste_goal_nl: '', topscorer_wk: '' }]

    const matchesChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: finishedMatches, error: null }) }
    const predictionsChain = { select: jest.fn().mockResolvedValue({ data: allPredictions, error: null }) }
    const wkUitslagChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: wkUitslag, error: null }) }
    const wkIncidentsChain = { select: jest.fn().mockResolvedValue({ data: wkIncidents, error: null }) }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: { message: 'Upsert failed' } }) }

    mockAdminFrom
      .mockReturnValueOnce(matchesChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(wkUitslagChain)
      .mockReturnValueOnce(wkIncidentsChain)
      .mockReturnValueOnce(upsertChain)

    const res = await POST()
    expect(res.status).toBe(500)
  })
})
