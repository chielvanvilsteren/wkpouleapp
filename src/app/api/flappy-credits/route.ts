import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { minGameMs } from '@/lib/flappy-physics'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function getBalance(supabase: SupabaseClient, userId: string) {
  const { data: preScore } = await supabase
    .from('scores')
    .select('selectie_punten, basis_xi_punten')
    .eq('user_id', userId)
    .maybeSingle()

  const preCredits =
    (preScore?.selectie_punten ?? 0) + (preScore?.basis_xi_punten ?? 0)

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
    .select('amount')
    .eq('user_id', userId)
  const adminGrants = (grants ?? []).reduce((sum, g) => sum + g.amount, 0)

  const { count: spent } = await supabase
    .from('flappy_credit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const totalEarned = preCredits + wkCredits + adminGrants
  const totalSpent = spent ?? 0
  const available = Math.max(0, totalEarned - totalSpent)

  return { available, totalEarned, totalSpent, preCredits, wkCredits, adminGrants }
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

  // ── Save: RLS verifies session ownership, UNIQUE prevents replay ─────────
  if (action === 'save') {
    const sessionId = body?.sessionId as string | undefined
    const score = Number(body?.score)
    const fps = body?.fps != null ? Math.round(Number(body.fps)) : null
    const duration_ms = body?.duration_ms != null ? Math.round(Number(body.duration_ms)) : null

    if (!sessionId || !Number.isInteger(score) || score < 0 || score > 9999) {
      return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
    }

    // Tijdvalidatie: server-side elapsed moet >= minGameMs(score) zijn (10% marge)
    if (score > 0) {
      const { data: session } = await supabase
        .from('flappy_credit_log')
        .select('played_at')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (!session) {
        return NextResponse.json({ error: 'Ongeldige sessie' }, { status: 403 })
      }

      const serverElapsedMs = Date.now() - new Date(session.played_at).getTime()
      const minimumMs = minGameMs(score) * 0.9

      const isSuspicious =
        serverElapsedMs < minimumMs ||
        (duration_ms != null && duration_ms < minimumMs)

      if (isSuspicious) {
        await supabase.from('flappy_suspicious_attempts').insert({
          user_id: user.id,
          session_id: sessionId,
          submitted_score: score,
          server_elapsed_ms: serverElapsedMs,
          minimum_ms: Math.round(minimumMs),
          client_duration_ms: duration_ms,
          fps,
        })
        return NextResponse.json({ error: 'Score niet mogelijk in de speeltijd' }, { status: 403 })
      }
    }

    const { error: scoreErr } = await supabase
      .from('flappy_scores')
      .insert({ user_id: user.id, score, credit_log_id: sessionId, fps, duration_ms })

    if (scoreErr) {
      if (scoreErr.code === '23505') {
        return NextResponse.json({ error: 'Score al opgeslagen voor dit potje' }, { status: 409 })
      }
      // RLS rejection (session not owned) returns 42501 / new row violates RLS
      if (scoreErr.code === '42501' || scoreErr.message.includes('row-level security')) {
        return NextResponse.json({ error: 'Ongeldige sessie' }, { status: 403 })
      }
      return NextResponse.json({ error: scoreErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
}
