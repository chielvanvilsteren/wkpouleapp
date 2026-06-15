import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function getBalance(supabase: SupabaseClient, userId: string) {
  const { data: matchPreds } = await supabase
    .from('match_predictions')
    .select('home_score, away_score, match_id')
    .eq('user_id', userId)

  let wkCredits = 0
  if (matchPreds && matchPreds.length > 0) {
    const ids = matchPreds.map((p) => p.match_id)
    const { data: matches } = await supabase
      .from('matches')
      .select('id, home_score, away_score, is_finished')
      .in('id', ids)
      .eq('is_finished', true)

    if (matches) {
      const byId = new Map(matches.map((m) => [m.id, m]))
      for (const pred of matchPreds) {
        const m = byId.get(pred.match_id)
        if (!m || m.home_score === null || m.away_score === null) continue
        if (pred.home_score === m.home_score && pred.away_score === m.away_score) {
          wkCredits += 5
        } else if (
          Math.sign(pred.home_score - pred.away_score) ===
          Math.sign(m.home_score - m.away_score)
        ) {
          wkCredits += 2
        }
      }
    }
  }

  const { data: grants } = await supabase
    .from('flappy_credit_grants')
    .select('amount, note')
    .eq('user_id', userId)
    .eq('season', 2)
  const prePouleCredits = (grants ?? [])
    .filter((g) => g.note === 'pre-poule')
    .reduce((sum, g) => sum + g.amount, 0)
  const manualGrants = (grants ?? [])
    .filter((g) => g.note !== 'pre-poule')
    .reduce((sum, g) => sum + g.amount, 0)

  const { count: spent } = await supabase
    .from('flappy_credit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('season', 2)

  const totalEarned = wkCredits + prePouleCredits + manualGrants
  const totalSpent = spent ?? 0
  const available = totalEarned - totalSpent

  return {
    available,
    totalEarned,
    totalSpent,
    wkCredits,
    prePouleCredits,
    manualGrants,
    adminGrants: manualGrants,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const balance = await getBalance(supabase, user.id)
  return NextResponse.json(balance)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const action = body?.action as string

  // ── Start: SECURITY DEFINER function does atomic balance check + insert ──
  if (action === 'start') {
    const { data: sessionId, error } = await supabase.rpc('start_flappy_session')

    if (error) {
      if (error.code === 'P0001') {
        return NextResponse.json({ error: 'Geen credits beschikbaar' }, { status: 403 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const balance = await getBalance(supabase, user.id)
    return NextResponse.json({ sessionId, newBalance: balance.available })
  }

  // ── Save: all validation + insert handled by SECURITY DEFINER function ──
  if (action === 'save') {
    const sessionId = body?.sessionId as string | undefined
    const score = Number(body?.score)
    const fps = body?.fps != null ? Math.round(Number(body.fps)) : null
    const duration_ms = body?.duration_ms != null ? Math.round(Number(body.duration_ms)) : null

    if (!sessionId || !Number.isInteger(score) || score < 0 || score > 9999) {
      return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
    }

    const { error: saveErr } = await supabase.rpc('save_flappy_score', {
      p_session_id: sessionId,
      p_score: score,
      p_fps: fps,
      p_duration_ms: duration_ms,
    })

    if (saveErr) {
      if (saveErr.code === 'P0001') return NextResponse.json({ error: 'Ongeldige sessie' }, { status: 403 })
      if (saveErr.code === 'P0002') return NextResponse.json({ error: 'Sessie verlopen' }, { status: 403 })
      if (saveErr.code === 'P0003') return NextResponse.json({ error: 'Score niet mogelijk in de speeltijd' }, { status: 403 })
      if (saveErr.code === '23505') return NextResponse.json({ error: 'Score al opgeslagen voor dit potje' }, { status: 409 })
      return NextResponse.json({ error: saveErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
}
