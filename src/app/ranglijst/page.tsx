import { createClient } from '@/lib/supabase/server'
import type { RanglijstEntry, Score, Profile } from '@/types'

export const dynamic = 'force-dynamic'

const MEDALS = ['🥇', '🥈', '🥉']

export default async function RanglijstPage() {
  const supabase = await createClient()

  const { data: uitslagRaw } = await supabase
    .from('master_uitslag')
    .select('scores_zichtbaar')
    .eq('id', 1)
    .single()

  const uitslag = uitslagRaw as { scores_zichtbaar: boolean } | null
  const scoresZichtbaar = uitslag?.scores_zichtbaar ?? false

  const { data: predictionsRaw } = await supabase
    .from('predictions')
    .select('user_id')

  const predictions = (predictionsRaw ?? []) as { user_id: string }[]
  const userIds = predictions.map((p) => p.user_id)

  let entries: RanglijstEntry[] = []

  if (userIds.length > 0) {
    const { data: profilesRaw } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)

    const profiles = (profilesRaw ?? []) as Pick<Profile, 'id' | 'display_name'>[]

    if (scoresZichtbaar) {
      const { data: scoresRaw } = await supabase
        .from('scores')
        .select('*')
        .in('user_id', userIds)

      const scores = (scoresRaw ?? []) as Score[]
      const scoreMap = new Map(scores.map((s) => [s.user_id, s]))

      entries = profiles.map((p) => {
        const s = scoreMap.get(p.id)
        return {
          user_id: p.id,
          display_name: p.display_name,
          selectie_punten: s?.selectie_punten ?? 0,
          basis_xi_punten: s?.basis_xi_punten ?? 0,
          incidenten_punten: s?.incidenten_punten ?? 0,
          totaal: s?.totaal ?? 0,
        }
      })

      entries.sort((a, b) => {
        if ((b.totaal ?? 0) !== (a.totaal ?? 0)) return (b.totaal ?? 0) - (a.totaal ?? 0)
        return a.display_name.localeCompare(b.display_name, 'nl')
      })
    } else {
      entries = profiles.map((p) => ({
        user_id: p.id,
        display_name: p.display_name,
        selectie_punten: null,
        basis_xi_punten: null,
        incidenten_punten: null,
        totaal: null,
      }))

      entries.sort((a, b) => a.display_name.localeCompare(b.display_name, 'nl'))
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-knvb-500 mb-1">Ranglijst</h1>
        <p className="text-gray-600">
          {scoresZichtbaar
            ? `${entries.length} deelnemers — scores zichtbaar`
            : `${entries.length} deelnemers — scores worden zichtbaar na de officiële uitslag`}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">⏳</div>
          <p>Nog geen voorspellingen ingediend.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-knvb-500 text-white text-sm">
                  <th className="px-4 py-3 text-left w-12">#</th>
                  <th className="px-4 py-3 text-left">Naam</th>
                  <th className="px-4 py-3 text-center">Selectie</th>
                  <th className="px-4 py-3 text-center">Basis XI</th>
                  <th className="px-4 py-3 text-center">Incidenten</th>
                  <th className="px-4 py-3 text-center font-bold">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr
                    key={entry.user_id}
                    className={`border-b border-gray-100 transition-colors ${
                      idx < 3 && scoresZichtbaar ? 'bg-oranje-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-center font-semibold text-gray-500">
                      {idx < 3 && scoresZichtbaar ? (
                        <span className="text-xl">{MEDALS[idx]}</span>
                      ) : (
                        idx + 1
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {entry.display_name}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {entry.selectie_punten !== null ? entry.selectie_punten : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {entry.basis_xi_punten !== null ? entry.basis_xi_punten : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {entry.incidenten_punten !== null ? entry.incidenten_punten : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.totaal !== null ? (
                        <span className="font-bold text-oranje-600 text-lg">{entry.totaal}</span>
                      ) : (
                        <span className="text-gray-400 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!scoresZichtbaar && entries.length > 0 && (
        <p className="text-center text-sm text-gray-400 mt-4">
          Scores worden gepubliceerd zodra de organisator de officiële uitslag heeft ingevoerd.
        </p>
      )}
    </div>
  )
}
