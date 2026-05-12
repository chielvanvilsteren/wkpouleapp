import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function mapToArr(map: Map<string, number>, total: number) {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
}

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: uitslag } = await admin
    .from('master_uitslag')
    .select('inzendingen_open, wk_poule_open, scores_zichtbaar, wk_scores_zichtbaar, selectie, basis_xi')
    .eq('id', 1)
    .single()

  const preOpen = !(uitslag?.scores_zichtbaar ?? false)
  const wkOpen = uitslag?.wk_poule_open !== false

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name')
    .eq('is_deelnemer', true)
    .order('display_name')

  const result: Record<string, unknown> = {
    pre_locked: preOpen,
    wk_locked: wkOpen,
    scores_zichtbaar: uitslag?.scores_zichtbaar ?? false,
    wk_scores_zichtbaar: uitslag?.wk_scores_zichtbaar ?? false,
    official_selectie: uitslag?.selectie ?? [],
    official_basis_xi: uitslag?.basis_xi ?? [],
    profiles: profiles ?? [],
  }

  if (!preOpen) {
    const { data: predictions } = await admin
      .from('predictions')
      .select('selectie, basis_xi')
      .eq('is_definitief', true)

    const total = predictions?.length ?? 0
    result.total_pre = total

    const selectieCount = new Map<string, number>()
    const basisXiCount = new Map<string, number>()

    for (const pred of predictions ?? []) {
      for (const p of (pred.selectie as string[] ?? [])) selectieCount.set(p, (selectieCount.get(p) ?? 0) + 1)
      for (const p of (pred.basis_xi as string[] ?? [])) basisXiCount.set(p, (basisXiCount.get(p) ?? 0) + 1)
    }

    result.selectie = mapToArr(selectieCount, total)
    result.basis_xi = mapToArr(basisXiCount, total)
  }

  if (!wkOpen) {
    const { data: incidents } = await admin
      .from('wk_incidents_predictions')
      .select('wereldkampioen, topscorer_wk, rode_kaart, gele_kaart, geblesseerde, eerste_goal_nl')
      .eq('is_definitief', true)

    const total = incidents?.length ?? 0
    result.total_wk = total

    const agg: Record<string, Map<string, number>> = {
      wereldkampioen: new Map(),
      topscorer: new Map(),
      rode_kaart: new Map(),
      gele_kaart: new Map(),
      geblesseerde: new Map(),
      eerste_goal_nl: new Map(),
    }

    for (const inc of incidents ?? []) {
      const add = (key: string, val: string | null | undefined) => {
        if (val) agg[key].set(val, (agg[key].get(val) ?? 0) + 1)
      }
      add('wereldkampioen', inc.wereldkampioen)
      add('topscorer', inc.topscorer_wk)
      add('rode_kaart', inc.rode_kaart)
      add('gele_kaart', inc.gele_kaart)
      add('geblesseerde', inc.geblesseerde)
      add('eerste_goal_nl', inc.eerste_goal_nl)
    }

    result.wk = Object.fromEntries(
      Object.entries(agg).map(([k, v]) => [k, mapToArr(v, total)])
    )
  }

  return NextResponse.json(result)
}
