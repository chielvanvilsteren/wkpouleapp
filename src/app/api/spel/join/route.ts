import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { code, displayName, sessionId } = await request.json()

  if (!code || !displayName?.trim() || !sessionId) {
    return NextResponse.json({ error: 'Code, naam en sessie vereist.' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: room } = await db
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle()

  if (!room) return NextResponse.json({ error: 'Spelcode niet gevonden.' }, { status: 404 })
  if (room.status !== 'waiting') return NextResponse.json({ error: 'Spel is al gestart.' }, { status: 400 })

  const { data: players } = await db.from('game_players').select('*').eq('room_code', room.code)
  const existing = players ?? []

  // Reconnect if already joined
  const me = existing.find(p => p.session_id === sessionId)
  if (me) {
    return NextResponse.json({
      code: room.code,
      team: me.team,
      playerIndex: me.player_index,
      isHost: room.host_id === sessionId,
      room: { teamSize: room.team_size, maxGoals: room.max_goals, maxMinutes: room.max_minutes },
    })
  }

  if (existing.length >= room.team_size * 2) {
    return NextResponse.json({ error: 'Spel is vol.' }, { status: 400 })
  }

  // Assign next open slot: fill blue first, then red
  let team: 'blue' | 'red' = 'blue'
  let playerIndex = 0
  let assigned = false

  for (let i = 0; i < room.team_size; i++) {
    if (!existing.find(p => p.team === 'blue' && p.player_index === i)) {
      team = 'blue'; playerIndex = i; assigned = true; break
    }
  }
  if (!assigned) {
    for (let i = 0; i < room.team_size; i++) {
      if (!existing.find(p => p.team === 'red' && p.player_index === i)) {
        team = 'red'; playerIndex = i; assigned = true; break
      }
    }
  }
  if (!assigned) return NextResponse.json({ error: 'Spel is vol.' }, { status: 400 })

  await db.from('game_players').insert({
    room_code: room.code,
    session_id: sessionId,
    display_name: displayName.trim(),
    team,
    player_index: playerIndex,
  })

  return NextResponse.json({
    code: room.code,
    team,
    playerIndex,
    isHost: room.host_id === sessionId,
    room: { teamSize: room.team_size, maxGoals: room.max_goals, maxMinutes: room.max_minutes },
  })
}
