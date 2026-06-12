/**
 * @jest-environment node
 */
import { GET } from '@/app/api/stats/route'
import { createClient } from '@supabase/supabase-js'

const mockFrom = jest.fn()
const mockClient = { from: mockFrom }

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockClient),
}))

function chain(result: unknown) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
  }
}

function setupStatsMocks({
  master,
  profiles = { data: [{ id: 'u1', display_name: 'Alice' }, { id: 'u2', display_name: 'Bob' }], error: null },
  incidents = {
    data: [
      { user_id: 'u1', wereldkampioen: 'Nederland', topscorer_wk: 'Depay', rode_kaart: 'Van Dijk', gele_kaart: 'Dumfries', geblesseerde: 'De Jong', eerste_goal_nl: 'Gakpo' },
      { user_id: 'u2', wereldkampioen: 'Nederland', topscorer_wk: 'Gakpo', rode_kaart: 'Van Dijk', gele_kaart: 'De Ligt', geblesseerde: 'De Jong', eerste_goal_nl: 'Gakpo' },
    ],
    error: null,
  },
}: {
  master: Record<string, unknown>
  profiles?: unknown
  incidents?: unknown
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'master_uitslag') return chain({ data: master, error: null })
    if (table === 'profiles') return chain(profiles)
    if (table === 'wk_incidents_predictions') {
      return { select: jest.fn().mockResolvedValue(incidents) }
    }
    if (table === 'predictions') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
    }
    return chain({ data: null, error: null })
  })
}

describe('GET /api/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date('2026-06-12T12:00:00.000Z'))
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows WK stats once the deadline has passed even before WK scores are visible', async () => {
    setupStatsMocks({
      master: {
        scores_zichtbaar: false,
        wk_scores_zichtbaar: false,
        wk_poule_open: true,
        wk_poule_deadline: '2026-06-12T11:59:00.000Z',
        selectie: [],
        basis_xi: [],
      },
    })

    const res = await GET()
    const body = await res.json()

    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'service-key',
      { auth: { persistSession: false } },
    )
    expect(body.pre_locked).toBe(true)
    expect(body.wk_locked).toBe(false)
    expect(body.wk_scores_zichtbaar).toBe(false)
    expect(body.total_wk).toBe(2)
    expect(body.wk.wereldkampioen[0]).toMatchObject({
      name: 'Nederland',
      count: 2,
      pct: 100,
      pickers: ['Alice', 'Bob'],
    })
  })

  it('keeps WK stats locked while the deadline is still in the future', async () => {
    setupStatsMocks({
      master: {
        scores_zichtbaar: false,
        wk_scores_zichtbaar: false,
        wk_poule_open: true,
        wk_poule_deadline: '2026-06-12T12:01:00.000Z',
        selectie: [],
        basis_xi: [],
      },
    })

    const res = await GET()
    const body = await res.json()

    expect(body.wk_locked).toBe(true)
    expect(body.wk).toBeUndefined()
    expect(mockFrom).not.toHaveBeenCalledWith('wk_incidents_predictions')
  })
})
