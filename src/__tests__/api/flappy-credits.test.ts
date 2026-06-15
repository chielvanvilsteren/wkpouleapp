/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/flappy-credits/route'

const mockGetUser = jest.fn()
const mockRpc = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

function resetMocks() {
  mockGetUser.mockReset()
  mockRpc.mockReset()
  mockFrom.mockReset()
}

// Helper: build a full chain for getBalance queries
function makeBalanceChain(result: object) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    // flappy_credit_log uses head:true count — resolved directly from eq()
    // we handle per-table below
  }
}

type MockResult = { data: unknown; error: null; count?: number | null }

// Convenience: set up getBalance from() calls to return benign data
function setupBalanceMocks({
  matchPreds = { data: [], error: null } as MockResult,
  grants = { data: [], error: null } as MockResult,
  spent = { data: null, count: 1, error: null } as MockResult,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'match_predictions') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(matchPreds),
      }
    }
    if (table === 'flappy_credit_grants') {
      let eqCalls = 0
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(),
      }
      chain.eq.mockImplementation(() => {
        eqCalls += 1
        return eqCalls >= 2 ? Promise.resolve(grants) : chain
      })
      return chain
    }
    if (table === 'flappy_credit_log') {
      let eqCalls = 0
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(),
      }
      chain.eq.mockImplementation(() => {
        eqCalls += 1
        return eqCalls >= 2 ? Promise.resolve(spent) : chain
      })
      return chain
    }
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }
  })
}

function twoEqChain(result: object) {
  let eqCalls = 0
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn(),
  }
  chain.eq.mockImplementation(() => {
    eqCalls += 1
    return eqCalls >= 2 ? Promise.resolve(result) : chain
  })
  return chain
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/flappy-credits
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/flappy-credits', () => {
  beforeEach(resetMocks)

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns balance with admin grants and no match predictions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupBalanceMocks({
      matchPreds: { data: [], error: null },
      grants: { data: [{ amount: 4, note: 'bonus' }], error: null },
      spent: { data: null, count: 2, error: null },
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.adminGrants).toBe(4)
    expect(body.manualGrants).toBe(4)
    expect(body.prePouleCredits).toBe(0)
    expect(body.totalSpent).toBe(2)
    expect(body.available).toBe(2) // 4 - 2
  })

  it('returns pre-poule credits separately from manual grants', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupBalanceMocks({
      matchPreds: { data: [], error: null },
      grants: {
        data: [
          { amount: 9, note: 'pre-poule' },
          { amount: 2, note: 'bonus' },
        ],
        error: null,
      },
      spent: { data: null, count: 3, error: null },
    })

    const res = await GET()
    const body = await res.json()

    expect(body.prePouleCredits).toBe(9)
    expect(body.manualGrants).toBe(2)
    expect(body.adminGrants).toBe(2)
    expect(body.totalEarned).toBe(11)
    expect(body.available).toBe(8)
  })

  it('returns balance with wkCredits for exact and correct-result predictions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const preds = [
      { match_id: 1, home_score: 2, away_score: 1 }, // exact → +5
      { match_id: 2, home_score: 1, away_score: 0 }, // correct result → +2
      { match_id: 3, home_score: 3, away_score: 3 }, // neither
      { match_id: 4, home_score: 1, away_score: 1 }, // match has null scores → skip
    ]
    const matches = [
      { id: 1, home_score: 2, away_score: 1, is_finished: true },
      { id: 2, home_score: 2, away_score: 0, is_finished: true },
      { id: 3, home_score: 1, away_score: 0, is_finished: true },
      { id: 4, home_score: null, away_score: null, is_finished: true },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'match_predictions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: preds, error: null }),
        }
      }
      if (table === 'matches') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: matches, error: null }),
        }
      }
      if (table === 'flappy_credit_grants') {
        return twoEqChain({ data: [], error: null })
      }
      if (table === 'flappy_credit_log') {
        return twoEqChain({ data: null, count: 0, error: null })
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: null, error: null }) }
    })

    const res = await GET()
    const body = await res.json()
    expect(body.wkCredits).toBe(7) // 5 + 2
    expect(body.available).toBe(7)
  })

  it('handles null grants/spent gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupBalanceMocks({
      matchPreds: { data: null, error: null },
      grants: { data: null, error: null },
      spent: { data: null, count: null, error: null },
    })
    const res = await GET()
    const body = await res.json()
    expect(body.available).toBe(0)
    expect(body.totalEarned).toBe(0)
    expect(body.totalSpent).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/flappy-credits — action: 'start'
// ─────────────────────────────────────────────────────────────────────────────
function makePostRequest(body: object) {
  return new Request('http://localhost/api/flappy-credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/flappy-credits — start', () => {
  beforeEach(resetMocks)

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makePostRequest({ action: 'start' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 with message when rpc errors with P0001', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'no credits' } })
    const res = await POST(makePostRequest({ action: 'start' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Geen credits beschikbaar')
  })

  it('returns 500 on other rpc error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: { code: 'XXXXX', message: 'db failure' } })
    const res = await POST(makePostRequest({ action: 'start' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('db failure')
  })

  it('returns sessionId and newBalance on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: 'session-abc', error: null })
    setupBalanceMocks({
      matchPreds: { data: [], error: null },
      grants: { data: [], error: null },
      spent: { data: null, count: 1, error: null },
    })
    const res = await POST(makePostRequest({ action: 'start' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessionId).toBe('session-abc')
    expect(typeof body.newBalance).toBe('number')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/flappy-credits — action: 'save'
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/flappy-credits — save', () => {
  beforeEach(resetMocks)

  it('returns 400 when sessionId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makePostRequest({ action: 'save', score: 10 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Ongeldige invoer')
  })

  it('returns 400 when score is not a valid integer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 1.5 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when score is negative', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: -1 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when score exceeds 9999', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 10000 }))
    expect(res.status).toBe(400)
  })

  it('returns 409 on duplicate score (23505)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 42 }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Score al opgeslagen voor dit potje')
  })

  it('returns 403 when the session is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'invalid session' } })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 10 }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Ongeldige sessie')
  })

  it('returns 403 when the session is expired', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'expired' } })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 10 }))
    expect(res.status).toBe(403)
  })

  it('returns 403 when the score is impossible for the play duration', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0003', message: 'too fast' } })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 10 }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Score niet mogelijk in de speeltijd')
  })

  it('returns 500 on other rpc error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: { code: 'XXXXX', message: 'unknown db error' } })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 10 }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('unknown db error')
  })

  it('returns { ok: true } on successful save', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: null })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 99 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/flappy-credits — unknown action
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/flappy-credits — unknown action', () => {
  beforeEach(resetMocks)

  it('returns 400 for unknown action', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makePostRequest({ action: 'explode' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Onbekende actie')
  })

  it('returns 400 when action is missing entirely', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makePostRequest({}))
    expect(res.status).toBe(400)
  })
})
