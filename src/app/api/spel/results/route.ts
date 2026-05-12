import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { results } = await request.json()
  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: 'Geen resultaten.' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await db.from('stickerbal_results').insert(
    results.map((r: { sessionId: string; displayName: string; result: string; goalsFor: number; goalsAgainst: number; roomCode: string }) => ({
      session_id:    r.sessionId,
      display_name:  r.displayName,
      result:        r.result,
      goals_for:     r.goalsFor,
      goals_against: r.goalsAgainst,
      room_code:     r.roomCode,
    }))
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
