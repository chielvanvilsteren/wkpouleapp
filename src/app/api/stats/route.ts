import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function mapToArr(countMap: Map<string, number>, pickersMap: Map<string, string[]>, total: number) {
  return Array.from(countMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      pickers: pickersMap.get(name) ?? [],
    }))
    .sort((a, b) => b.count - a.count)
}

function isPassed(dateValue: string | null | undefined) {
  if (!dateValue) return false
  const date = new Date(dateValue)
  return !Number.isNaN(date.getTime()) && Date.now() >= date.getTime()
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Stats configuratie ontbreekt op de server.' },
      { status: 500 }
    )
  }

  const admin = createClient(
    supabaseUrl,
    supabaseKey,
    { auth: { persistSession: false } }
  )

  const { data: uitslag, error: uitslagError } = await admin
    .from('master_uitslag')
    .select('inzendingen_open, inzendingen_deadline, wk_poule_open, wk_poule_deadline, scores_zichtbaar, wk_scores_zichtbaar, selectie, basis_xi')
    .eq('id', 1)
    .single()

  if (uitslagError || !uitslag) {
    return NextResponse.json(
      { error: 'Stats instellingen konden niet worden geladen.' },
      { status: 500 }
    )
  }

  const preDeadlinePassed = isPassed(uitslag.inzendingen_deadline as string | null | undefined)
  const preLocked = !(uitslag.scores_zichtbaar ?? false)
    && (uitslag.inzendingen_open ?? true)
    && !preDeadlinePassed

  const wkDeadlinePassed = isPassed(uitslag.wk_poule_deadline as string | null | undefined)
  const wkLocked = (uitslag.wk_poule_open ?? true) && !wkDeadlinePassed

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, display_name')
    .eq('is_deelnemer', true)
    .order('display_name')

  if (profilesError) {
    return NextResponse.json(
      { error: 'Deelnemers konden niet worden geladen voor stats.' },
      { status: 500 }
    )
  }

  const result: Record<string, unknown> = {
    pre_locked: preLocked,
    wk_locked: wkLocked,
    inzendingen_deadline_passed: preDeadlinePassed,
    wk_poule_deadline_passed: wkDeadlinePassed,
    scores_zichtbaar: uitslag.scores_zichtbaar ?? false,
    wk_scores_zichtbaar: uitslag.wk_scores_zichtbaar ?? false,
    official_selectie: uitslag.selectie ?? [],
    official_basis_xi: uitslag.basis_xi ?? [],
    profiles: profiles ?? [],
  }

  if (!preLocked) {
    const { data: predictions, error: predictionsError } = await admin
      .from('predictions')
      .select('user_id, selectie, basis_xi')
      .eq('is_definitief', true)

    if (predictionsError) {
      return NextResponse.json(
        { error: 'Pre-pool stats konden niet worden geladen.' },
        { status: 500 }
      )
    }

    const total = predictions?.length ?? 0
    result.total_pre = total

    const nameMap = new Map((profiles ?? []).map(p => [p.id as string, p.display_name as string]))

    const selectieCount = new Map<string, number>()
    const selectiePickers = new Map<string, string[]>()
    const basisXiCount = new Map<string, number>()
    const basisXiPickers = new Map<string, string[]>()

    for (const pred of predictions ?? []) {
      const displayName = nameMap.get(pred.user_id as string) ?? '?'
      for (const p of (pred.selectie as string[] ?? [])) {
        selectieCount.set(p, (selectieCount.get(p) ?? 0) + 1)
        selectiePickers.set(p, [...(selectiePickers.get(p) ?? []), displayName])
      }
      for (const p of (pred.basis_xi as string[] ?? [])) {
        basisXiCount.set(p, (basisXiCount.get(p) ?? 0) + 1)
        basisXiPickers.set(p, [...(basisXiPickers.get(p) ?? []), displayName])
      }
    }

    result.selectie = mapToArr(selectieCount, selectiePickers, total)
    result.basis_xi = mapToArr(basisXiCount, basisXiPickers, total)
  }

  if (!wkLocked) {
    const { data: incidents, error: incidentsError } = await admin
      .from('wk_incidents_predictions')
      .select('user_id, wereldkampioen, topscorer_wk, rode_kaart, gele_kaart, geblesseerde, eerste_goal_nl')

    if (incidentsError) {
      return NextResponse.json(
        { error: 'WK stats konden niet worden geladen.' },
        { status: 500 }
      )
    }

    const total = incidents?.length ?? 0
    result.total_wk = total

    const nameMap = new Map((profiles ?? []).map(p => [p.id as string, p.display_name as string]))

    const agg: Record<string, Map<string, number>> = {
      wereldkampioen: new Map(), topscorer: new Map(), rode_kaart: new Map(),
      gele_kaart: new Map(), geblesseerde: new Map(), eerste_goal_nl: new Map(),
    }
    const aggPickers: Record<string, Map<string, string[]>> = {
      wereldkampioen: new Map(), topscorer: new Map(), rode_kaart: new Map(),
      gele_kaart: new Map(), geblesseerde: new Map(), eerste_goal_nl: new Map(),
    }

    for (const inc of incidents ?? []) {
      const displayName = nameMap.get(inc.user_id as string) ?? '?'
      const add = (key: string, val: string | null | undefined) => {
        if (!val) return
        agg[key].set(val, (agg[key].get(val) ?? 0) + 1)
        aggPickers[key].set(val, [...(aggPickers[key].get(val) ?? []), displayName])
      }
      add('wereldkampioen', inc.wereldkampioen)
      add('topscorer', inc.topscorer_wk)
      add('rode_kaart', inc.rode_kaart)
      add('gele_kaart', inc.gele_kaart)
      add('geblesseerde', inc.geblesseerde)
      add('eerste_goal_nl', inc.eerste_goal_nl)
    }

    result.wk = Object.fromEntries(
      Object.entries(agg).map(([k, v]) => [k, mapToArr(v, aggPickers[k], total)])
    )
  }

  return NextResponse.json(result)
}
