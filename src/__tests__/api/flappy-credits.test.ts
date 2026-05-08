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

// Convenience: set up all four getBalance from() calls to return benign data
function setupBalanceMocks({
  preScore = { data: { selectie_punten: 3, basis_xi_punten: 2 }, error: null },
  matchPreds = { data: [], error: null },
  grants = { data: [], error: null },
  spent = { data: null, count: 1, error: null },
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'scores') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue(preScore),
      }
    }
    if (table === 'match_predictions') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(matchPreds),
      }
    }
    if (table === 'flappy_credit_grants') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(grants),
      }
    }
    if (table === 'flappy_credit_log') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(spent),
      }
    }
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/flappy-credits
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/flappy-credits', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns balance with pre-credits and no match predictions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupBalanceMocks({
      preScore: { data: { selectie_punten: 3, basis_xi_punten: 2 }, error: null },
      matchPreds: { data: [], error: null },
      grants: { data: [{ amount: 4 }], error: null },
      spent: { data: null, count: 2, error: null },
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.preCredits).toBe(5)
    expect(body.adminGrants).toBe(4)
    expect(body.totalSpent).toBe(2)
    expect(body.available).toBe(7) // 5 + 4 - 2
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
      if (table === 'scores') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
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
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === 'flappy_credit_log') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, count: 0, error: null }),
        }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: null, error: null }) }
    })

    const res = await GET()
    const body = await res.json()
    expect(body.wkCredits).toBe(7) // 5 + 2
    expect(body.available).toBe(7)
  })

  it('handles null preScore and null grants/spent gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupBalanceMocks({
      preScore: { data: null, error: null },
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
  beforeEach(() => jest.clearAllMocks())

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
      preScore: { data: { selectie_punten: 5, basis_xi_punten: 0 }, error: null },
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
  beforeEach(() => jest.clearAllMocks())

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
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate' } }),
    })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 42 }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Score al opgeslagen voor dit potje')
  })

  it('returns 403 on RLS error with code 42501', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: { code: '42501', message: 'permission denied' } }),
    })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 10 }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Ongeldige sessie')
  })

  it('returns 403 on RLS error with row-level security in message', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: { code: 'OTHER', message: 'new row violates row-level security policy' } }),
    })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 10 }))
    expect(res.status).toBe(403)
  })

  it('returns 500 on other insert error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: { code: 'XXXXX', message: 'unknown db error' } }),
    })
    const res = await POST(makePostRequest({ action: 'save', sessionId: 's1', score: 10 }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('unknown db error')
  })

  it('returns { ok: true } on successful save', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })
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
  beforeEach(() => jest.clearAllMocks())

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
