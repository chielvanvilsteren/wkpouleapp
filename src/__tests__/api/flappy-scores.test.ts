/**
 * @jest-environment node
 */
import { GET } from '@/app/api/flappy-scores/route'

const mockGetUser = jest.fn()
const mockSelect = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()
const mockIn = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

function makeChain(result: object) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
    in: jest.fn().mockResolvedValue(result),
  }
  return chain
}

describe('GET /api/flappy-scores', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns empty array when no scores', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))
    const res = await GET()
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns 500 on scores query error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const chain = makeChain({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(chain)
    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('returns scores merged with display_name', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const scores = [{ id: 1, score: 42, played_at: '2026-01-01', user_id: 'u1' }]
    const profiles = [{ id: 'u1', display_name: 'Chiel' }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'flappy_scores') return makeChain({ data: scores, error: null })
      if (table === 'profiles') return makeChain({ data: profiles, error: null })
      return makeChain({ data: [], error: null })
    })

    const res = await GET()
    const body = await res.json()
    expect(body).toEqual([{ id: 1, score: 42, played_at: '2026-01-01', user_id: 'u1', display_name: 'Chiel' }])
  })

  it('sets display_name to null when profile not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const scores = [{ id: 1, score: 10, played_at: '2026-01-01', user_id: 'unknown' }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'flappy_scores') return makeChain({ data: scores, error: null })
      if (table === 'profiles') return makeChain({ data: [], error: null })
      return makeChain({ data: [], error: null })
    })

    const res = await GET()
    const body = await res.json()
    expect(body[0].display_name).toBeNull()
  })
})
