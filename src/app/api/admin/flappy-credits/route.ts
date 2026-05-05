import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function checkAdmin(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  return !!data?.is_admin
}

// GET — lijst van alle deelnemers met creditsaldo
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await checkAdmin(supabase, user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('is_deelnemer', true)
    .order('display_name')
  if (!profiles || profiles.length === 0) return NextResponse.json([])

  const userIds = profiles.map((p) => p.id)

  const [
    { data: scores },
    { data: grants },
    { data: spent },
    { data: allPreds },
  ] = await Promise.all([
    supabase
      .from('scores')
      .select('user_id, selectie_punten, basis_xi_punten')
      .in('user_id', userIds),
    supabase
      .from('flappy_credit_grants')
      .select('user_id, amount, note, granted_at')
      .in('user_id', userIds)
      .order('granted_at', { ascending: false }),
    supabase
      .from('flappy_credit_log')
      .select('user_id')
      .in('user_id', userIds),
    supabase
      .from('match_predictions')
      .select('user_id, home_score, away_score, match_id')
      .in('user_id', userIds),
  ])

  // Haal gespeelde wedstrijden op
  let matchMap = new Map<number, { home_score: number | null; away_score: number | null }>()
  if (allPreds && allPreds.length > 0) {
    const matchIds = Array.from(new Set(allPreds.map((p) => p.match_id)))
    const { data: matches } = await supabase
      .from('matches')
      .select('id, home_score, away_score, is_finished')
      .in('id', matchIds)
      .eq('is_finished', true)
    if (matches) matchMap = new Map(matches.map((m) => [m.id, m]))
  }

  const result = profiles.map((profile) => {
    const pre = (scores ?? []).find((s) => s.user_id === profile.id)
    const preCredits = (pre?.selectie_punten ?? 0) + (pre?.basis_xi_punten ?? 0)

    const adminGrants = (grants ?? [])
      .filter((g) => g.user_id === profile.id)
      .reduce((sum, g) => sum + g.amount, 0)

    const spentCount = (spent ?? []).filter((s) => s.user_id === profile.id).length

    let wkCredits = 0
    const preds = (allPreds ?? []).filter((p) => p.user_id === profile.id)
    for (const pred of preds) {
      const m = matchMap.get(pred.match_id)
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

    const totalEarned = preCredits + wkCredits + adminGrants
    const available = Math.max(0, totalEarned - spentCount)

    return {
      id: profile.id,
      display_name: profile.display_name,
      preCredits,
      wkCredits,
      adminGrants,
      spent: spentCount,
      available,
    }
  })

  return NextResponse.json(result)
}

// POST — ken credits toe aan een gebruiker
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await checkAdmin(supabase, user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, amount, note } = body

  if (
    typeof userId !== 'string' ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > 100
  ) {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const { error } = await supabase.from('flappy_credit_grants').insert({
    user_id: userId,
    granted_by: user.id,
    amount,
    note: typeof note === 'string' && note.trim() ? note.trim() : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
