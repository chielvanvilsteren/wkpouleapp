/**
 * @jest-environment node
 */
import { GET } from '@/app/auth/callback/route'
import { NextRequest } from 'next/server'

const mockExchangeCodeForSession = jest.fn()
const mockCookiesStore = {
  getAll: jest.fn().mockReturnValue([]),
  set: jest.fn(),
}

// Capture the options passed to createServerClient so we can exercise setAll
let capturedCookieOptions: {
  getAll: () => unknown[]
  setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void
} | null = null

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookiesStore)),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((_url: string, _key: string, options: { cookies: typeof capturedCookieOptions }) => {
    capturedCookieOptions = options.cookies
    return {
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    }
  }),
}))

function makeRequest(params: Record<string, string>, origin = 'http://localhost:3000') {
  const url = new URL(`${origin}/auth/callback`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

describe('GET /auth/callback', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv
    capturedCookieOptions = null
    jest.clearAllMocks()
  })

  it('redirects to login?error=link_verlopen when no code is present', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.com'
    const req = makeRequest({})
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.com/login?error=link_verlopen')
  })

  it('redirects to /auth/reset-password after successful code exchange', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.com'
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    const req = makeRequest({ code: 'valid-code' })
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.com/auth/reset-password')
  })

  it('redirects to login?error=link_verlopen when exchange returns error', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.com'
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: 'expired' } })
    const req = makeRequest({ code: 'bad-code' })
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.com/login?error=link_verlopen')
  })

  it('falls back to req.nextUrl.origin when NEXT_PUBLIC_APP_URL is unset', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    const req = makeRequest({ code: 'some-code' }, 'http://localhost:5000')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:5000/auth/reset-password')
  })

  it('ignores the `next` param (always redirects to reset-password on success)', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.com'
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    const req = makeRequest({ code: 'c', next: '/dashboard' })
    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://app.com/auth/reset-password')
  })

  it('exercises setAll cookie option (covers lines 20-23 in the route)', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.com'
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    const req = makeRequest({ code: 'x' })
    await GET(req)

    // createServerClient was called — capturedCookieOptions now holds the real functions
    expect(capturedCookieOptions).not.toBeNull()

    // Exercise getAll
    const allCookies = capturedCookieOptions!.getAll()
    expect(mockCookiesStore.getAll).toHaveBeenCalled()
    expect(allCookies).toEqual([])

    // Exercise setAll — triggers the forEach inside the route's setAll body
    capturedCookieOptions!.setAll([
      { name: 'sb-token', value: 'abc', options: { httpOnly: true } },
      { name: 'sb-refresh', value: 'xyz' },
    ])
    expect(mockCookiesStore.set).toHaveBeenCalledWith('sb-token', 'abc', { httpOnly: true })
    expect(mockCookiesStore.set).toHaveBeenCalledWith('sb-refresh', 'xyz', undefined)
  })
})
