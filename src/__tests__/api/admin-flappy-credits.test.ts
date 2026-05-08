/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/admin/flappy-credits/route'

const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

function makePostRequest(body: object) {
  return new Request('http://localhost/api/admin/flappy-credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Build a chainable mock that resolves at the end of the chain
function makeChain(result: object) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    insert: jest.fn().mockResolvedValue(result),
  }
  // Make all methods also resolve the promise at the last call of in() / order()
  return chain
}

// ─── helpers to build admin mock setup ───────────────────────────────────────

type SetupOptions = {
  adminCheck?: object
  profiles?: object
  scores?: object
  grants?: object
  spent?: object
  allPreds?: object
  matches?: object
}

function setupAdminMocks({
  adminCheck = { data: { is_admin: true }, error: null },
  profiles = { data: [{ id: 'u1', display_name: 'Alice' }], error: null },
  scores = { data: [], error: null },
  grants = { data: [], error: null },
  spent = { data: [], error: null },
  allPreds = { data: [], error: null },
  matches = { data: [], error: null },
}: SetupOptions = {}) {
  let profileCallCount = 0

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      profileCallCount++
      if (profileCallCount === 1) {
        // checkAdmin: .select('is_admin').eq('id', userId).single()
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue(adminCheck),
        }
      }
      // second call: deelnemer list .select('id, display_name').eq('is_deelnemer', true).order(...)
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(profiles),
      }
    }
    if (table === 'scores') {
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue(scores),
      }
    }
    if (table === 'flappy_credit_grants') {
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(grants),
        insert: jest.fn().mockResolvedValue({ error: null }),
      }
    }
    if (table === 'flappy_credit_log') {
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue(spent),
      }
    }
    if (table === 'match_predictions') {
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue(allPreds),
      }
    }
    if (table === 'matches') {
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(matches),
      }
    }
    return makeChain({ data: null, error: null })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/flappy-credits
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/admin/flappy-credits', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupAdminMocks({ adminCheck: { data: { is_admin: false }, error: null } })
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns empty array when no deelnemers', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupAdminMocks({ profiles: { data: [], error: null } })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns empty array when profiles is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupAdminMocks({ profiles: { data: null, error: null } })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns basic credits with preCredits and adminGrants', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupAdminMocks({
      profiles: { data: [{ id: 'u1', display_name: 'Alice' }], error: null },
      scores: { data: [{ user_id: 'u1', selectie_punten: 3, basis_xi_punten: 2 }], error: null },
      grants: { data: [{ user_id: 'u1', amount: 5, note: 'bonus', granted_at: '2026-01-01' }], error: null },
      spent: { data: [{ user_id: 'u1' }, { user_id: 'u1' }], error: null },
      allPreds: { data: [], error: null },
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    const alice = body[0]
    expect(alice.preCredits).toBe(5)
    expect(alice.adminGrants).toBe(5)
    expect(alice.spent).toBe(2)
    expect(alice.available).toBe(8) // 5+5 - 2
    expect(alice.wkCredits).toBe(0)
  })

  it('computes wkCredits: exact=5, correct result=2, neither=0', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })

    const preds = [
      { user_id: 'u1', match_id: 1, home_score: 2, away_score: 1 }, // exact → +5
      { user_id: 'u1', match_id: 2, home_score: 1, away_score: 0 }, // correct result → +2
      { user_id: 'u1', match_id: 3, home_score: 0, away_score: 0 }, // neither
      { user_id: 'u1', match_id: 5, home_score: 1, away_score: 1 }, // null scores → skip
    ]
    const matchData = [
      { id: 1, home_score: 2, away_score: 1, is_finished: true },
      { id: 2, home_score: 3, away_score: 0, is_finished: true },
      { id: 3, home_score: 2, away_score: 1, is_finished: true },
      { id: 5, home_score: null, away_score: null, is_finished: true },
    ]

    let profileCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        profileCallCount++
        if (profileCallCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [{ id: 'u1', display_name: 'Alice' }], error: null }),
        }
      }
      if (table === 'scores') {
        return { select: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: [], error: null }) }
      }
      if (table === 'flappy_credit_grants') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === 'flappy_credit_log') {
        return { select: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: [], error: null }) }
      }
      if (table === 'match_predictions') {
        return { select: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: preds, error: null }) }
      }
      if (table === 'matches') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: matchData, error: null }),
        }
      }
      return makeChain({ data: null, error: null })
    })

    const res = await GET()
    const body = await res.json()
    expect(body[0].wkCredits).toBe(7) // 5 + 2
  })

  it('handles null scores/grants/spent/allPreds (exercises ?? [] fallbacks)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupAdminMocks({
      profiles: { data: [{ id: 'u1', display_name: 'Zero' }], error: null },
      scores: { data: null, error: null },
      grants: { data: null, error: null },
      spent: { data: null, error: null },
      allPreds: { data: null, error: null },
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].preCredits).toBe(0)
    expect(body[0].adminGrants).toBe(0)
    expect(body[0].spent).toBe(0)
    expect(body[0].wkCredits).toBe(0)
    expect(body[0].available).toBe(0)
  })

  it('handles pred with no matching match in matchMap (skips)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })

    const preds = [
      { user_id: 'u1', match_id: 99, home_score: 1, away_score: 0 }, // match 99 not in matchData
    ]

    let profileCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        profileCallCount++
        if (profileCallCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [{ id: 'u1', display_name: 'Bob' }], error: null }),
        }
      }
      if (table === 'scores') {
        return { select: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: [], error: null }) }
      }
      if (table === 'flappy_credit_grants') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === 'flappy_credit_log') {
        return { select: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: [], error: null }) }
      }
      if (table === 'match_predictions') {
        return { select: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: preds, error: null }) }
      }
      if (table === 'matches') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          // return empty matches — pred match_id 99 won't be found
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return makeChain({ data: null, error: null })
    })

    const res = await GET()
    const body = await res.json()
    expect(body[0].wkCredits).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/flappy-credits
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/admin/flappy-credits', () => {
  beforeEach(() => jest.clearAllMocks())

  function setupPostAdminMocks(insertResult = { error: null }) {
    let profileCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        profileCallCount++
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
        }
      }
      if (table === 'flappy_credit_grants') {
        return {
          insert: jest.fn().mockResolvedValue(insertResult),
        }
      }
      return makeChain({ data: null, error: null })
    })
  }

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makePostRequest({ userId: 'u1', amount: 5 }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
    })
    const res = await POST(makePostRequest({ userId: 'u2', amount: 5 }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when userId is not a string', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupPostAdminMocks()
    const res = await POST(makePostRequest({ userId: 123, amount: 5 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Ongeldig verzoek')
  })

  it('returns 400 when amount is not an integer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupPostAdminMocks()
    const res = await POST(makePostRequest({ userId: 'u1', amount: 1.5 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when amount is less than 1', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupPostAdminMocks()
    const res = await POST(makePostRequest({ userId: 'u1', amount: 0 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when amount is greater than 100', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupPostAdminMocks()
    const res = await POST(makePostRequest({ userId: 'u1', amount: 101 }))
    expect(res.status).toBe(400)
  })

  it('returns 500 on database insert error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupPostAdminMocks({ error: { message: 'db error' } })
    const res = await POST(makePostRequest({ userId: 'u1', amount: 5 }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('db error')
  })

  it('returns { ok: true } on successful grant with note', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupPostAdminMocks({ error: null })
    const res = await POST(makePostRequest({ userId: 'u1', amount: 10, note: 'bonus' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('returns { ok: true } on successful grant without note', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    setupPostAdminMocks({ error: null })
    const res = await POST(makePostRequest({ userId: 'u1', amount: 5 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('treats whitespace-only note as null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    let capturedInsert: object | null = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
        }
      }
      if (table === 'flappy_credit_grants') {
        return {
          insert: jest.fn().mockImplementation((data: object) => {
            capturedInsert = data
            return Promise.resolve({ error: null })
          }),
        }
      }
      return makeChain({ data: null, error: null })
    })
    const res = await POST(makePostRequest({ userId: 'u1', amount: 5, note: '   ' }))
    expect(res.status).toBe(200)
    expect((capturedInsert as Record<string, unknown> | null)?.note).toBeNull()
  })
})
