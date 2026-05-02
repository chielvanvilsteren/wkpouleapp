const mockGetAll = jest.fn(() => [{ name: 'sb-cookie', value: 'val' }])
const mockSet = jest.fn()

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    getAll: mockGetAll,
    set: mockSet,
  })),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ mock: 'server-client' })),
}))

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>

describe('supabase server client', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    jest.clearAllMocks()
    mockGetAll.mockReturnValue([{ name: 'sb-cookie', value: 'val' }])
    mockCreateServerClient.mockReturnValue({ mock: 'server-client' } as ReturnType<typeof createServerClient>)
  })

  it('calls createServerClient with env vars', async () => {
    await createClient()
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )
  })

  it('returns the result from createServerClient', async () => {
    const result = await createClient()
    expect(result).toEqual({ mock: 'server-client' })
  })

  it('getAll callback calls cookieStore.getAll', async () => {
    await createClient()
    const cookiesArg = mockCreateServerClient.mock.calls[0][2] as { cookies: { getAll: () => unknown; setAll: (c: Array<{ name: string; value: string }>) => void } }
    const result = cookiesArg.cookies.getAll()
    expect(mockGetAll).toHaveBeenCalled()
    expect(result).toEqual([{ name: 'sb-cookie', value: 'val' }])
  })

  it('setAll callback calls cookieStore.set for each cookie', async () => {
    await createClient()
    const cookiesArg = mockCreateServerClient.mock.calls[0][2] as { cookies: { getAll: () => unknown; setAll: (c: Array<{ name: string; value: string; options?: unknown }>) => void } }
    const cookiesToSet = [
      { name: 'c1', value: 'v1', options: {} },
      { name: 'c2', value: 'v2' },
    ]
    cookiesArg.cookies.setAll(cookiesToSet)
    expect(mockSet).toHaveBeenCalledTimes(2)
  })

  it('setAll does not throw when cookieStore.set throws (Server Component)', async () => {
    mockSet.mockImplementation(() => { throw new Error('read-only') })
    await createClient()
    const cookiesArg = mockCreateServerClient.mock.calls[0][2] as { cookies: { getAll: () => unknown; setAll: (c: Array<{ name: string; value: string }>) => void } }
    expect(() => cookiesArg.cookies.setAll([{ name: 'c', value: 'v' }])).not.toThrow()
  })
})
