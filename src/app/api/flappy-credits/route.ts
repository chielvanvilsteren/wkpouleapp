import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function getBalance(supabase: SupabaseClient, userId: string) {
  // 1. Pre-pool credits: 1 per correct selectie-speler + 1 per correct basis-XI speler
  const { data: preScore } = await supabase
    .from('scores')
    .select('selectie_punten, basis_xi_punten')
    .eq('user_id', userId)
    .maybeSingle()

  const preCredits =
    (preScore?.selectie_punten ?? 0) + (preScore?.basis_xi_punten ?? 0)

  // 2. WK-poule credits: 5 per exact resultaat, 2 per correct resultaat (W/G/V)
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

  // 3. Admin-toegekende credits
  const { data: grants } = await supabase
    .from('flappy_credit_grants')
    .select('amount')
    .eq('user_id', userId)
  const adminGrants = (grants ?? []).reduce((sum, g) => sum + g.amount, 0)

  // 4. Credits al verbruikt (één per gespeeld potje)
  const { count: spent } = await supabase
    .from('flappy_credit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const totalEarned = preCredits + wkCredits + adminGrants
  const totalSpent = spent ?? 0
  const available = Math.max(0, totalEarned - totalSpent)

  return { available, totalEarned, totalSpent, preCredits, wkCredits, adminGrants }
}

// GET — haal huidig creditsaldo op
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const balance = await getBalance(supabase, user.id)
  return NextResponse.json(balance)
}

// POST — verbruik 1 credit en sla optioneel de score op
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const save = Boolean(body?.save)
  const score = Number(body?.score)

  if (save && (!Number.isInteger(score) || score < 0 || score > 9999)) {
    return NextResponse.json({ error: 'Ongeldige score' }, { status: 400 })
  }

  const balance = await getBalance(supabase, user.id)
  if (balance.available <= 0) {
    return NextResponse.json({ error: 'Geen credits beschikbaar' }, { status: 403 })
  }

  // Verbruik 1 credit
  const { error: logErr } = await supabase
    .from('flappy_credit_log')
    .insert({ user_id: user.id })
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })

  // Optioneel score opslaan
  if (save) {
    const { error: scoreErr } = await supabase
      .from('flappy_scores')
      .insert({ user_id: user.id, score })
    if (scoreErr) return NextResponse.json({ error: scoreErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, newBalance: Math.max(0, balance.available - 1) })
}
