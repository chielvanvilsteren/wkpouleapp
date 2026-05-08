/**
 * @jest-environment node
 */
import { GET } from '@/app/api/health/route'
import { NextRequest } from 'next/server'

function makeRequest(accept: string | null, origin = 'http://localhost:3000') {
  const url = new URL(`${origin}/api/health`)
  const headers: Record<string, string> = {}
  if (accept !== null) headers['accept'] = accept
  const req = new NextRequest(url, { headers })
  return req
}

describe('GET /api/health', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv
  })

  it('returns { ok: true } when accept header is absent (null → fallback to empty string)', async () => {
    // Pass null so no accept header is set, exercising the `?? ''` fallback
    const req = makeRequest(null)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('returns { ok: true } for non-browser requests (empty accept header)', async () => {
    const req = makeRequest('')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('returns { ok: true } when accept does not include text/html', async () => {
    const req = makeRequest('application/json')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('redirects to NEXT_PUBLIC_APP_URL/status for browser requests', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com'
    const req = makeRequest('text/html,application/xhtml+xml')
    const res = await GET(req)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://myapp.com/status')
  })

  it('falls back to req.nextUrl.origin when NEXT_PUBLIC_APP_URL is unset', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const req = makeRequest('text/html', 'http://localhost:4000')
    const res = await GET(req)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('http://localhost:4000/status')
  })
})
