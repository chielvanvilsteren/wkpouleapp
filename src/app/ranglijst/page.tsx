import { createClient } from '@/lib/supabase/server'
import RanglijstTabs from '@/components/RanglijstTabs'
import PageHeader from '@/components/PageHeader'
import type { Profile, Score, WkScore, RanglijstEntry } from '@/types'

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
        />
      </div>
    </>
  )
}
