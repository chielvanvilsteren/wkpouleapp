import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const a = searchParams.get('a')
  const b = searchParams.get('b')

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: uitslag } = await admin
    .from('master_uitslag')
    .select('scores_zichtbaar, wk_scores_zichtbaar')
    .eq('id', 1)
    .single()

  const scoresVisible = uitslag?.scores_zichtbaar ?? false
  const wkVisible = uitslag?.wk_scores_zichtbaar ?? false

  if (!a || !b) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name')
      .eq('is_deelnemer', true)
      .order('display_name')
    return NextResponse.json({ profiles: profiles ?? [], scoresVisible, wkVisible })
  }

  if (a === b) {
    return NextResponse.json({ error: 'Kies twee verschillende spelers.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const empty = Promise.resolve({ data: [] as any[] })

  const [
    { data: profilesRaw },
    { data: scoresRaw },
    { data: wkScoresRaw },
    { data: predictionsRaw },
    { data: wkIncidentsRaw },
  ] = await Promise.all([
    admin.from('profiles').select('id, display_name').in('id', [a, b]),
    scoresVisible ? admin.from('scores').select('user_id, selectie_punten, basis_xi_punten, totaal').in('user_id', [a, b]) : empty,
    wkVisible ? admin.from('wk_scores').select('user_id, match_punten, incidents_punten, topscorer_punten, toernooi_punten, totaal').in('user_id', [a, b]) : empty,
    scoresVisible ? admin.from('predictions').select('user_id, selectie, basis_xi').in('user_id', [a, b]) : empty,
    wkVisible ? admin.from('wk_incidents_predictions').select('user_id, rode_kaart, gele_kaart, geblesseerde, eerste_goal_nl, topscorer_wk, wereldkampioen, finale_team1, finale_team2').in('user_id', [a, b]) : empty,
  ])

  if (!profilesRaw?.length) {
    return NextResponse.json({ error: 'Gebruikers niet gevonden.' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const build = (id: string) => {
    const profile = profilesRaw.find(p => p.id === id)
    if (!profile) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pred = predictionsRaw?.find((p: any) => p.user_id === id)
    return {
      id,
      display_name: profile.display_name as string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scores: (scoresRaw?.find((s: any) => s.user_id === id) ?? null) as Record<string, number> | null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wk_scores: (wkScoresRaw?.find((s: any) => s.user_id === id) ?? null) as Record<string, number> | null,
      selectie: (pred?.selectie as string[]) ?? null,
      basis_xi: (pred?.basis_xi as string[]) ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      incidents: (wkIncidentsRaw?.find((i: any) => i.user_id === id) ?? null) as Record<string, string> | null,
    }
  }

  const userA = build(a)
  const userB = build(b)

  if (!userA || !userB) {
    return NextResponse.json({ error: 'Gebruikers niet gevonden.' }, { status: 404 })
  }

  const selA = new Set<string>(userA.selectie ?? [])
  const selB = new Set<string>(userB.selectie ?? [])
  const xiA = new Set<string>(userA.basis_xi ?? [])
  const xiB = new Set<string>(userB.basis_xi ?? [])

  const overlap = scoresVisible ? {
    selectie: {
      both: Array.from(selA).filter(p => selB.has(p)).sort(),
      only_a: Array.from(selA).filter(p => !selB.has(p)).sort(),
      only_b: Array.from(selB).filter(p => !selA.has(p)).sort(),
    },
    basis_xi: {
      both: Array.from(xiA).filter(p => xiB.has(p)).sort(),
      only_a: Array.from(xiA).filter(p => !xiB.has(p)).sort(),
      only_b: Array.from(xiB).filter(p => !xiA.has(p)).sort(),
    },
  } : null

  return NextResponse.json({ scoresVisible, wkVisible, a: userA, b: userB, overlap })
}
