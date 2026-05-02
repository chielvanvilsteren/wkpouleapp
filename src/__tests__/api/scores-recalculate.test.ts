/**
 * @jest-environment node
 */
import { POST } from '@/app/api/scores/recalculate/route'

// Mock @/lib/supabase/server
const mockSupabaseAuth = { getUser: jest.fn() }
const mockSupabaseFrom = jest.fn()
const mockSupabaseClient = {
  auth: mockSupabaseAuth,
  from: mockSupabaseFrom,
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Mock @supabase/supabase-js (admin client)
const mockAdminFrom = jest.fn()
const mockAdminClient = { from: mockAdminFrom }

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockAdminClient),
}))

function makeChain(data: unknown, error: unknown = null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    upsert: jest.fn().mockResolvedValue({ error }),
  }
}

describe('POST /api/scores/recalculate', () => {
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
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const profileChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
    }
    mockSupabaseFrom.mockReturnValue(profileChain)

    const res = await POST()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 400 when master_uitslag not found', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const profileChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    }
    mockSupabaseFrom.mockReturnValue(profileChain)

    const uitslagChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }
    mockAdminFrom.mockReturnValueOnce(uitslagChain)

    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Master uitslag')
  })

  it('returns 500 when predictions fetch fails', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const profileChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    }
    mockSupabaseFrom.mockReturnValue(profileChain)

    // uitslag OK
    const uitslagChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 1, selectie: ['Van Dijk'], basis_xi: ['Van Dijk'] }, error: null }),
    }
    // predictions error
    const predictionsChain = {
      select: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
    }
    mockAdminFrom
      .mockReturnValueOnce(uitslagChain)
      .mockReturnValueOnce(predictionsChain)

    const res = await POST()
    expect(res.status).toBe(500)
  })

  it('returns 200 with "Geen voorspellingen" when empty predictions', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const profileChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    }
    mockSupabaseFrom.mockReturnValue(profileChain)

    const uitslagChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 1, selectie: ['Van Dijk'], basis_xi: ['Van Dijk'] }, error: null }),
    }
    const predictionsChain = {
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockAdminFrom
      .mockReturnValueOnce(uitslagChain)
      .mockReturnValueOnce(predictionsChain)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toContain('Geen voorspellingen')
  })

  it('returns 200 success with correct score calculation', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const profileChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    }
    mockSupabaseFrom.mockReturnValue(profileChain)

    const uitslag = {
      id: 1,
      selectie: ['Van Dijk', 'De Jong', 'Dumfries'],
      basis_xi: ['Van Dijk', 'De Jong'],
    }
    const predictions = [
      {
        user_id: 'u1',
        selectie: ['Van Dijk', 'Xavi'],  // 1 match
        basis_xi: ['Van Dijk', 'De Jong'],  // 2 matches
      },
    ]

    const uitslagChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: uitslag, error: null }),
    }
    const predictionsChain = {
      select: jest.fn().mockResolvedValue({ data: predictions, error: null }),
    }
    const upsertChain = {
      upsert: jest.fn().mockResolvedValue({ error: null }),
    }
    mockAdminFrom
      .mockReturnValueOnce(uitslagChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(upsertChain)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(1)

    // Check upsert was called with correct scores
    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    expect(upsertArg[0].selectie_punten).toBe(1)
    expect(upsertArg[0].basis_xi_punten).toBe(2)
    expect(upsertArg[0].totaal).toBe(3)
  })

  it('handles null uitslag.selectie and uitslag.basis_xi (uses ?? [] fallback)', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const profileChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    }
    mockSupabaseFrom.mockReturnValue(profileChain)

    // uitslag has null selectie and basis_xi
    const uitslag = { id: 1, selectie: null, basis_xi: null }
    const predictions = [{ user_id: 'u1', selectie: ['Van Dijk'], basis_xi: ['De Jong'] }]

    const uitslagChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: uitslag, error: null }),
    }
    const predictionsChain = {
      select: jest.fn().mockResolvedValue({ data: predictions, error: null }),
    }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }
    mockAdminFrom
      .mockReturnValueOnce(uitslagChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(upsertChain)

    const res = await POST()
    expect(res.status).toBe(200)
    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    expect(upsertArg[0].selectie_punten).toBe(0)
    expect(upsertArg[0].basis_xi_punten).toBe(0)
  })

  it('handles null selectie and basis_xi in predictions (uses ?? [] fallback)', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const profileChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    }
    mockSupabaseFrom.mockReturnValue(profileChain)

    const uitslag = { id: 1, selectie: ['Van Dijk'], basis_xi: ['De Jong'] }
    const predictions = [{ user_id: 'u1', selectie: null, basis_xi: null }]

    const uitslagChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: uitslag, error: null }),
    }
    const predictionsChain = {
      select: jest.fn().mockResolvedValue({ data: predictions, error: null }),
    }
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) }
    mockAdminFrom
      .mockReturnValueOnce(uitslagChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(upsertChain)

    const res = await POST()
    expect(res.status).toBe(200)
    const upsertArg = upsertChain.upsert.mock.calls[0][0]
    expect(upsertArg[0].selectie_punten).toBe(0)
    expect(upsertArg[0].basis_xi_punten).toBe(0)
  })

  it('returns 500 when upsert fails', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const profileChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    }
    mockSupabaseFrom.mockReturnValue(profileChain)

    const uitslagChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 1, selectie: ['Van Dijk'], basis_xi: ['Van Dijk'] }, error: null }),
    }
    const predictionsChain = {
      select: jest.fn().mockResolvedValue({
        data: [{ user_id: 'u1', selectie: ['Van Dijk'], basis_xi: ['Van Dijk'] }],
        error: null,
      }),
    }
    const upsertChain = {
      upsert: jest.fn().mockResolvedValue({ error: { message: 'Upsert failed' } }),
    }
    mockAdminFrom
      .mockReturnValueOnce(uitslagChain)
      .mockReturnValueOnce(predictionsChain)
      .mockReturnValueOnce(upsertChain)

    const res = await POST()
    expect(res.status).toBe(500)
  })
})
