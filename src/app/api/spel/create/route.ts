import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: Request) {
  const { displayName, teamSize, maxGoals, maxMinutes, sessionId, dribblingEnabled, powerupsEnabled, testMode } = await request.json()

  if (!displayName?.trim() || !sessionId) {
    return NextResponse.json({ error: 'Naam en sessie vereist.' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let code = randomCode()
  for (let i = 0; i < 10; i++) {
    const { data } = await db.from('game_rooms').select('code').eq('code', code).maybeSingle()
    if (!data) break
    code = randomCode()
  }

  const { data: uitslag } = await db.from('master_uitslag').select('stickerbal_speed').eq('id', 1).maybeSingle()
  const speedMultiplier = Number(uitslag?.stickerbal_speed) || 1.0

  const { error: roomErr } = await db.from('game_rooms').insert({
    code,
    host_id: sessionId,
    team_size: Math.min(Math.max(Number(teamSize) || 1, 1), 3),
    max_goals: Number(maxGoals) || 5,
    max_minutes: Number(maxMinutes) || 3,
    status: 'waiting',
    speed_multiplier: speedMultiplier,
    dribbling_enabled: dribblingEnabled !== false,
    powerups_enabled: powerupsEnabled === true,
    test_mode: testMode === true,
  })
  if (roomErr) return NextResponse.json({ error: roomErr.message }, { status: 500 })

  const { error: playerErr } = await db.from('game_players').insert({
    room_code: code,
    session_id: sessionId,
    display_name: displayName.trim(),
    team: 'blue',
    player_index: 0,
  })
  if (playerErr) return NextResponse.json({ error: playerErr.message }, { status: 500 })

  return NextResponse.json({ code, team: 'blue', playerIndex: 0, isHost: true, speedMultiplier })
}
