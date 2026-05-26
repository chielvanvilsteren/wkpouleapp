import { createClient } from '@/lib/supabase/server'
import RanglijstTabs from '@/components/RanglijstTabs'
import PageHeader from '@/components/PageHeader'
import type { Profile, Score, WkScore, RanglijstEntry, FlappyEntry, StickerbalEntry } from '@/types'

export const dynamic = 'force-dynamic'

export default async function RanglijstPage() {
  const supabase = await createClient()

  const { data: uitslagRaw } = await supabase
    .from('master_uitslag')
    .select('scores_zichtbaar, wk_scores_zichtbaar')
    .eq('id', 1)
    .single()

  const uitslag = uitslagRaw as { scores_zichtbaar: boolean; wk_scores_zichtbaar: boolean } | null
  const scoresZichtbaar = uitslag?.scores_zichtbaar ?? false
  const wkScoresZichtbaar = uitslag?.wk_scores_zichtbaar ?? false

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('is_deelnemer', true)
    .order('display_name', { ascending: true })

  const profiles = (profilesRaw ?? []) as Pick<Profile, 'id' | 'display_name'>[]
  const userIds = profiles.map((p) => p.id)

  let preScores: Map<string, Score> = new Map()
  let wkScores: Map<string, WkScore> = new Map()

  if (userIds.length > 0) {
    const [{ data: preRaw }, { data: wkRaw }] = await Promise.all([
      scoresZichtbaar
        ? supabase.from('scores').select('*').in('user_id', userIds)
        : Promise.resolve({ data: [] }),
      wkScoresZichtbaar
        ? supabase.from('wk_scores').select('*').in('user_id', userIds)
        : Promise.resolve({ data: [] }),
    ])

    preScores = new Map((preRaw ?? []).map((s) => [s.user_id, s as Score]))
    wkScores = new Map((wkRaw ?? []).map((s) => [s.user_id, s as WkScore]))
  }

  // Flappy scores — best per user (seizoen 1 en 2 apart)
  const [{ data: flappyRaw }, { data: flappyRawS1 }] = await Promise.all([
    supabase.from('flappy_scores').select('user_id, score, fps').eq('season', 2),
    supabase.from('flappy_scores').select('user_id, score, fps').eq('season', 1),
  ])

  function buildFlappyEntries(rows: typeof flappyRaw): FlappyEntry[] {
    const bestMap = new Map<string, { score: number; fps: number | null }>()
    for (const row of (rows ?? [])) {
      const prev = bestMap.get(row.user_id)
      if (!prev || row.score > prev.score) {
        bestMap.set(row.user_id, { score: row.score, fps: row.fps ?? null })
      }
    }
    return Array.from(bestMap.entries())
      .map(([user_id, { score, fps }]) => ({
        user_id,
        display_name: profiles.find((p) => p.id === user_id)?.display_name ?? '???',
        best_score: score,
        best_fps: fps,
      }))
      .sort((a, b) => b.best_score - a.best_score)
  }

  const flappyEntries = buildFlappyEntries(flappyRaw)
  const flappySeason1Entries = buildFlappyEntries(flappyRawS1)

  // Stickerbal results — aggregated by display_name, excluding bots/test
  const { data: stickerbalRaw } = await supabase
    .from('stickerbal_results')
    .select('display_name, result, goals_for, goals_against')

  const stickerbalMap = new Map<string, StickerbalEntry>()
  for (const r of (stickerbalRaw ?? []) as { display_name: string; result: string; goals_for: number; goals_against: number }[]) {
    const key = r.display_name.toLowerCase()
    const e = stickerbalMap.get(key) ?? { display_name: r.display_name, games: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0 }
    e.games++
    if (r.result === 'win') e.wins++
    else if (r.result === 'draw') e.draws++
    else e.losses++
    e.goals_for += r.goals_for ?? 0
    e.goals_against += r.goals_against ?? 0
    stickerbalMap.set(key, e)
  }
  const stickerbalEntries: StickerbalEntry[] = Array.from(stickerbalMap.values())
    .sort((a, b) => b.wins - a.wins || b.draws - a.draws || b.goals_for - a.goals_for)

  const entries: RanglijstEntry[] = profiles.map((p) => {
    const pre = preScores.get(p.id)
    const wk = wkScores.get(p.id)
    return {
      user_id: p.id,
      display_name: p.display_name,
      selectie_punten: scoresZichtbaar ? (pre?.selectie_punten ?? 0) : null,
      basis_xi_punten: scoresZichtbaar ? (pre?.basis_xi_punten ?? 0) : null,
      pre_totaal: scoresZichtbaar ? (pre?.totaal ?? 0) : null,
      match_punten: wkScoresZichtbaar ? (wk?.match_punten ?? 0) : null,
      incidents_punten: wkScoresZichtbaar ? (wk?.incidents_punten ?? 0) : null,
      topscorer_punten: wkScoresZichtbaar ? (wk?.topscorer_punten ?? 0) : null,
      toernooi_punten: wkScoresZichtbaar ? (wk?.toernooi_punten ?? 0) : null,
      wk_totaal: wkScoresZichtbaar ? (wk?.totaal ?? 0) : null,
      totaal: (scoresZichtbaar || wkScoresZichtbaar)
        ? ((pre?.totaal ?? 0) + (wk?.totaal ?? 0))
        : null,
    }
  })

  return (
    <>
      <PageHeader
        title="Ranglijst"
        subtitle={`${profiles.length} deelnemers`}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <RanglijstTabs
          entries={entries}
          scoresZichtbaar={scoresZichtbaar}
          wkScoresZichtbaar={wkScoresZichtbaar}
          flappyEntries={flappyEntries}
          flappySeason1Entries={flappySeason1Entries}
          stickerbalEntries={stickerbalEntries}
        />
      </div>
    </>
  )
}
