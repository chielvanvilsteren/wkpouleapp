/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

function mockFootballData() {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      matches: [
        {
          id: 123,
          status: 'FINISHED',
          homeTeam: { name: 'Mexico' },
          awayTeam: { name: 'South Africa' },
          score: { fullTime: { home: 2, away: 1 } },
        },
      ],
    }),
  } as Response))
}

function setupEnv() {
  jest.resetModules()
  process.env.FOOTBALL_DATA_API_KEY = 'football-data-key'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.SYNC_SECRET_TOKEN = 'test-sync-token-123456789012345678'
}

describe('POST /api/sync-results', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.dontMock('@supabase/supabase-js')
    jest.dontMock('@/lib/supabase/server')
  })

  it('uses the authenticated admin session client for manual admin syncs', async () => {
    setupEnv()
    mockFootballData()

    const userClient = {
      auth: {
        getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'admin-user' } } })),
      },
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { is_admin: true }, error: null })),
              })),
            })),
          }
        }

        if (table === 'matches') {
          return {
            select: jest.fn(() => ({
              or: jest.fn(() => Promise.resolve({
                data: [{
                  id: 1,
                  match_number: 1,
                  external_api_id: null,
                  home_team: 'Mexico',
                  away_team: 'Zuid-Afrika',
                  home_score: null,
                  away_score: null,
                  is_finished: false,
                }],
                error: null,
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ error: null })),
            })),
          }
        }

        return {
          insert: jest.fn(() => Promise.resolve({ error: null })),
        }
      }),
    }

    const createServiceClient = jest.fn()
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: createServiceClient,
    }))
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(() => Promise.resolve(userClient)),
    }))

    const { POST } = await import('@/app/api/sync-results/route')
    const res = await POST(new NextRequest('http://localhost:3000/api/sync-results', { method: 'POST' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.updated).toBe(1)
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(userClient.rpc).toHaveBeenCalledWith('configure_sync_rpc_secret', {
      p_sync_token: 'test-sync-token-123456789012345678',
    })

    const expectedDateFrom = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0]
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain(`dateFrom=${expectedDateFrom}`)
  })

  it('uses the anon key and RPC path for cron syncs', async () => {
    setupEnv()

    const apiClient = {
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            not: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    }

    const createServiceClient = jest.fn(() => apiClient)
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: createServiceClient,
    }))
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(),
    }))

    const { POST } = await import('@/app/api/sync-results/route')
    await POST(new NextRequest('http://localhost:3000/api/sync-results', {
      method: 'POST',
      headers: { authorization: 'Bearer test-sync-token-123456789012345678' },
    }))

    expect(createServiceClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'anon-key',
      { auth: { persistSession: false } },
    )
  })
})
