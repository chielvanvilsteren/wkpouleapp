import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

  const admin = createAdminClient()

  // ── Start: deduct credit at play time, return session ID ──────
  if (action === 'start') {
    const balance = await getBalance(supabase, user.id)
    if (balance.available <= 0) {
      return NextResponse.json({ error: 'Geen credits beschikbaar' }, { status: 403 })
    }

    // Service role bypasses RLS — balance check above is the only gate
    const { data: log, error: logErr } = await admin
      .from('flappy_credit_log')
      .insert({ user_id: user.id })
      .select('session_id')
      .single()

    if (logErr || !log) {
      return NextResponse.json({ error: logErr?.message ?? 'Server error' }, { status: 500 })
    }

    return NextResponse.json({ sessionId: log.session_id, newBalance: balance.available - 1 })
  }

  // ── Save: bind score to session (UNIQUE prevents replay with different score) ──
  if (action === 'save') {
    const sessionId = body?.sessionId as string | undefined
    const score = Number(body?.score)

    if (!sessionId || !Number.isInteger(score) || score < 0 || score > 9999) {
      return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
    }

    // Verify session belongs to this user (use user JWT client for row-level check)
    const { data: log } = await supabase
      .from('flappy_credit_log')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!log) {
      return NextResponse.json({ error: 'Ongeldige sessie' }, { status: 403 })
    }

    // Service role bypasses RLS — session ownership verified above
    const { error: scoreErr } = await admin
      .from('flappy_scores')
      .insert({ user_id: user.id, score, credit_log_id: sessionId })

    if (scoreErr) {
      if (scoreErr.code === '23505') {
        return NextResponse.json({ error: 'Score al opgeslagen voor dit potje' }, { status: 409 })
      }
      return NextResponse.json({ error: scoreErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
}
