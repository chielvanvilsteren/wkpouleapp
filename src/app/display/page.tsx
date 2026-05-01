import { createClient } from '@/lib/supabase/server'
import DisplayRefresh from './DisplayRefresh'
import type { Profile, Score, WkScore } from '@/types'

export const dynamic = 'force-dynamic'

const MEDALS = ['🥇', '🥈', '🥉']

export default async function DisplayPage() {
  const supabase = await createClient()

  const { data: uitslagRaw } = await supabase
    .from('master_uitslag')
    .select('scores_zichtbaar, wk_scores_zichtbaar')
    .eq('id', 1)
    .single()

  const uitslag = uitslagRaw as { scores_zichtbaar: boolean; wk_scores_zichtbaar: boolean } | null
  const scoresZichtbaar = uitslag?.scores_zichtbaar ?? false
  const wkScoresZichtbaar = uitslag?.wk_scores_zichtbaar ?? false
  const anyScores = scoresZichtbaar || wkScoresZichtbaar

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('is_deelnemer', true)
    .order('display_name', { ascending: true })

  const profiles = (profilesRaw ?? []) as Pick<Profile, 'id' | 'display_name'>[]
  const userIds = profiles.map((p) => p.id)

  const preScoreMap = new Map<string, Score>()
  const wkScoreMap = new Map<string, WkScore>()

  if (userIds.length > 0) {
    if (scoresZichtbaar) {
      const { data } = await supabase.from('scores').select('*').in('user_id', userIds)
      for (const s of (data ?? [])) preScoreMap.set(s.user_id, s as Score)
    }
    if (wkScoresZichtbaar) {
      const { data } = await supabase.from('wk_scores').select('*').in('user_id', userIds)
      for (const s of (data ?? [])) wkScoreMap.set(s.user_id, s as WkScore)
    }
  }

  const entries = profiles.map((p) => {
    const pre = preScoreMap.get(p.id)
    const wk = wkScoreMap.get(p.id)
    return {
      user_id: p.id,
      display_name: p.display_name,
      pre_totaal: scoresZichtbaar ? (pre?.totaal ?? 0) : null,
      wk_totaal: wkScoresZichtbaar ? (wk?.totaal ?? 0) : null,
      totaal: (pre?.totaal ?? 0) + (wk?.totaal ?? 0),
    }
  }).sort((a, b) => {
    if (anyScores && b.totaal !== a.totaal) return b.totaal - a.totaal
    return a.display_name.localeCompare(b.display_name, 'nl')
  })

  return (
    <div className="min-h-screen bg-knvb-500 flex flex-col">
      <DisplayRefresh />

      <div className="text-center py-8 px-4">
        <div className="text-5xl mb-2">🇳🇱</div>
        <h1 className="text-4xl font-bold text-white tracking-wide">Oranje Pool WK 2026</h1>
        <p className="text-white/60 mt-2 text-lg">
          {anyScores ? 'Ranglijst' : 'Deelnemers — scores volgen later'}
        </p>
      </div>

      <div className="flex-1 px-6 pb-10 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead>
              <tr className="bg-oranje-500 text-white text-lg">
                <th className="px-6 py-4 text-left w-16">#</th>
                <th className="px-6 py-4 text-left">Naam</th>
                {scoresZichtbaar && <th className="px-4 py-4 text-center">Pre-pool</th>}
                {wkScoresZichtbaar && <th className="px-4 py-4 text-center">WK Poule</th>}
                {anyScores && <th className="px-6 py-4 text-center font-bold">Totaal</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr
                  key={entry.user_id}
                  className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${idx < 3 && anyScores ? 'bg-oranje-50' : ''}`}
                >
                  <td className="px-6 py-4 text-center font-bold text-gray-400 text-xl">
                    {idx < 3 && anyScores ? <span className="text-2xl">{MEDALS[idx]}</span> : idx + 1}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900 text-xl">{entry.display_name}</td>
                  {scoresZichtbaar && <td className="px-4 py-4 text-center text-gray-600 text-lg">{entry.pre_totaal ?? '—'}</td>}
                  {wkScoresZichtbaar && <td className="px-4 py-4 text-center text-gray-600 text-lg">{entry.wk_totaal ?? '—'}</td>}
                  {anyScores && (
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-oranje-600 text-2xl">{entry.totaal}</span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center pb-6 text-white/40 text-sm">
        Vernieuwt automatisch elke 30 seconden
      </div>
    </div>
  )
}
