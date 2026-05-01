import { createClient } from '@/lib/supabase/server'
import DisplayRefresh from './DisplayRefresh'
import type { RanglijstEntry, Score, Profile } from '@/types'

export const dynamic = 'force-dynamic'

const MEDALS = ['🥇', '🥈', '🥉']

export default async function DisplayPage() {
  const supabase = await createClient()

  const { data: uitslagRaw } = await supabase
    .from('master_uitslag')
    .select('scores_zichtbaar')
    .eq('id', 1)
    .single()

  const scoresZichtbaar = (uitslagRaw as { scores_zichtbaar: boolean } | null)?.scores_zichtbaar ?? false

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name', { ascending: true })

  const profiles = (profilesRaw ?? []) as Pick<Profile, 'id' | 'display_name'>[]
  const userIds = profiles.map((p) => p.id)

  let entries: RanglijstEntry[] = []

  if (scoresZichtbaar && userIds.length > 0) {
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
  }

  return (
    <div className="min-h-screen bg-knvb-500 flex flex-col">
      <DisplayRefresh />

      {/* Header */}
      <div className="text-center py-8 px-4">
        <div className="text-5xl mb-2">🇳🇱</div>
        <h1 className="text-4xl font-bold text-white tracking-wide">Oranje Pool WK 2026</h1>
        <p className="text-white/60 mt-2 text-lg">
          {scoresZichtbaar ? 'Ranglijst' : 'Deelnemers — scores volgen na de uitslag'}
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 px-6 pb-10 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead>
              <tr className="bg-oranje-500 text-white text-lg">
                <th className="px-6 py-4 text-left w-16">#</th>
                <th className="px-6 py-4 text-left">Naam</th>
                {scoresZichtbaar && (
                  <>
                    <th className="px-4 py-4 text-center">Selectie</th>
                    <th className="px-4 py-4 text-center">Basis XI</th>
                    <th className="px-4 py-4 text-center">Incidenten</th>
                    <th className="px-6 py-4 text-center font-bold">Totaal</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr
                  key={entry.user_id}
                  className={`border-b border-gray-100 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } ${idx < 3 && scoresZichtbaar ? 'bg-oranje-50' : ''}`}
                >
                  <td className="px-6 py-4 text-center font-bold text-gray-400 text-xl">
                    {idx < 3 && scoresZichtbaar ? (
                      <span className="text-2xl">{MEDALS[idx]}</span>
                    ) : (
                      idx + 1
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900 text-xl">
                    {entry.display_name}
                  </td>
                  {scoresZichtbaar && (
                    <>
                      <td className="px-4 py-4 text-center text-gray-600 text-lg">
                        {entry.selectie_punten ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-600 text-lg">
                        {entry.basis_xi_punten ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-600 text-lg">
                        {entry.incidenten_punten ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-oranje-600 text-2xl">{entry.totaal}</span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 text-white/40 text-sm">
        Vernieuwt automatisch elke 30 seconden
      </div>
    </div>
  )
}
