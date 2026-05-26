import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY
const WK_COMPETITION_ID = 2000

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })

  if (!FOOTBALL_DATA_API_KEY) {
    return NextResponse.json({
      reachable: false,
      error: 'FOOTBALL_DATA_API_KEY niet geconfigureerd',
      quota_remaining: null,
      quota_reset_seconds: null,
      response_ms: null,
    })
  }

  const start = Date.now()
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${WK_COMPETITION_ID}`,
      { headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY } },
    )
    const response_ms = Date.now() - start

    const quota_remaining = res.headers.get('X-Requests-Available-Minute')
    const quota_reset_seconds = res.headers.get('X-RequestCounter-Reset')

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json({
        reachable: false,
        error: `HTTP ${res.status}: ${body.slice(0, 200)}`,
        quota_remaining: quota_remaining ? parseInt(quota_remaining) : null,
        quota_reset_seconds: quota_reset_seconds ? parseInt(quota_reset_seconds) : null,
        response_ms,
      })
    }

    return NextResponse.json({
      reachable: true,
      error: null,
      quota_remaining: quota_remaining ? parseInt(quota_remaining) : null,
      quota_reset_seconds: quota_reset_seconds ? parseInt(quota_reset_seconds) : null,
      response_ms,
    })
  } catch (err) {
    return NextResponse.json({
      reachable: false,
      error: err instanceof Error ? err.message : 'Onbekende fout',
      quota_remaining: null,
      quota_reset_seconds: null,
      response_ms: Date.now() - start,
    })
  }
}
