/**
 * @jest-environment node
 */

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { middleware, config } from '@/middleware'

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`)
}

function setupGetUser(user: unknown) {
  const mockGetUser = jest.fn().mockResolvedValue({ data: { user } })
  mockCreateServerClient.mockImplementation(
    (_url, _key, opts) => {
      // Call setAll/getAll callbacks if needed
      return { auth: { getUser: mockGetUser } } as ReturnType<typeof createServerClient>
    }
  )
  return mockGetUser
}

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('unauthenticated user accessing /mijn-voorspelling redirects to /login', async () => {
    setupGetUser(null)
    const req = makeRequest('/mijn-voorspelling')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toContain('/login')
    expect(location).toContain('redirect=%2Fmijn-voorspelling')
  })

  it('unauthenticated user accessing /admin redirects to /login', async () => {
    setupGetUser(null)
    const req = makeRequest('/admin')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toContain('/login')
  })

  it('unauthenticated user accessing public route passes through', async () => {
    setupGetUser(null)
    const req = makeRequest('/ranglijst')
    const res = await middleware(req)
    expect(res.status).not.toBe(307)
    expect(res.status).not.toBe(302)
  })

  it('authenticated user accessing /login redirects to /mijn-voorspelling', async () => {
    setupGetUser({ id: 'u1' })
    const req = makeRequest('/login')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toContain('/mijn-voorspelling')
  })

  it('authenticated user accessing /register redirects to /mijn-voorspelling', async () => {
    setupGetUser({ id: 'u1' })
    const req = makeRequest('/register')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toContain('/mijn-voorspelling')
  })

  it('authenticated user accessing protected route passes through', async () => {
    setupGetUser({ id: 'u1' })
    const req = makeRequest('/mijn-voorspelling')
    const res = await middleware(req)
    expect(res.status).not.toBe(307)
  })

  it('sets x-pathname header on response', async () => {
    setupGetUser(null)
    const req = makeRequest('/ranglijst')
    const res = await middleware(req)
    expect(res.headers.get('x-pathname')).toBe('/ranglijst')
  })

  it('config matcher exists and is an array', () => {
    expect(config.matcher).toBeDefined()
    expect(Array.isArray(config.matcher)).toBe(true)
  })

  it('unauthenticated user accessing home page passes through', async () => {
    setupGetUser(null)
    const req = makeRequest('/')
    const res = await middleware(req)
    expect(res.status).not.toBe(307)
  })

  it('invokes getAll and setAll cookie callbacks during Supabase init', async () => {
    let getAllCalled = false
    let setAllCalled = false
    mockCreateServerClient.mockImplementationOnce((_url, _key, opts: unknown) => {
      const cookies = (opts as { cookies: { getAll: () => unknown; setAll: (c: { name: string; value: string; options?: object }[]) => void } }).cookies
      cookies.getAll()
      getAllCalled = true
      cookies.setAll([{ name: 'sb-test', value: 'val', options: { path: '/' } }])
      setAllCalled = true
      return { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) } } as ReturnType<typeof createServerClient>
    })
    const req = makeRequest('/ranglijst')
    await middleware(req)
    expect(getAllCalled).toBe(true)
    expect(setAllCalled).toBe(true)
  })
})
