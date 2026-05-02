jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({ mock: 'client' })),
}))

import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/client'

const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>

describe('supabase client', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('calls createBrowserClient with env vars', () => {
    createClient()
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    )
  })

  it('returns the result from createBrowserClient', () => {
    const result = createClient()
    expect(result).toEqual({ mock: 'client' })
  })
})
