'use client'

import { useState } from 'react'
import type { RanglijstEntry } from '@/types'

type Props = {
  entries: RanglijstEntry[]
  scoresZichtbaar: boolean
  wkScoresZichtbaar: boolean
}

const MEDALS = ['🥇', '🥈', '🥉']

type Tab = 'pre' | 'wk' | 'totaal'

export default function RanglijstTabs({ entries, scoresZichtbaar, wkScoresZichtbaar }: Props) {
  const [tab, setTab] = useState<Tab>('totaal')

  const sorted = [...entries].sort((a, b) => {
    const getVal = (e: RanglijstEntry) => {
      if (tab === 'pre') return e.pre_totaal ?? 0
      if (tab === 'wk') return e.wk_totaal ?? 0
      return e.totaal ?? 0
    }
    const diff = getVal(b) - getVal(a)
    if (diff !== 0) return diff
    return a.display_name.localeCompare(b.display_name, 'nl')
  })

  const showScores = tab === 'pre' ? scoresZichtbaar : tab === 'wk' ? wkScoresZichtbaar : (scoresZichtbaar || wkScoresZichtbaar)
  const anyScores = scoresZichtbaar || wkScoresZichtbaar

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(['totaal', 'pre', 'wk'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-knvb-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'totaal' ? 'Gecombineerd' : t === 'pre' ? 'Pre-pool' : 'WK Poule'}
          </button>
        ))}
      </div>

      {!showScores && (
        <p className="text-center text-sm text-gray-400 mb-4">
          {tab === 'pre' && 'Pre-pool scores worden zichtbaar na de officiële uitslag.'}
          {tab === 'wk' && 'WK Poule scores worden zichtbaar zodra de organisator scores publiceert.'}
          {tab === 'totaal' && 'Scores worden zichtbaar zodra de organisator ze publiceert.'}
        </p>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-knvb-500 text-white text-sm">
                <th className="px-4 py-3 text-left w-12">#</th>
                <th className="px-4 py-3 text-left">Naam</th>
                {tab === 'pre' && scoresZichtbaar && (
                  <>
                    <th className="px-4 py-3 text-center">Selectie</th>
                    <th className="px-4 py-3 text-center">Basis XI</th>
                    <th className="px-4 py-3 text-center font-bold">Totaal</th>
                  </>
                )}
                {tab === 'wk' && wkScoresZichtbaar && (
                  <>
                    <th className="px-4 py-3 text-center">Wedstr.</th>
                    <th className="px-4 py-3 text-center">Incidents</th>
                    <th className="px-4 py-3 text-center">Topscorer</th>
                    <th className="px-4 py-3 text-center font-bold">Totaal</th>
                  </>
                )}
                {tab === 'totaal' && anyScores && (
                  <>
                    {scoresZichtbaar && <th className="px-4 py-3 text-center">Pre-pool</th>}
                    {wkScoresZichtbaar && <th className="px-4 py-3 text-center">WK Poule</th>}
                    <th className="px-4 py-3 text-center font-bold">Totaal</th>
                  </>
                )}
                {!showScores && <th className="px-4 py-3 text-center">Score</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, idx) => (
                <tr key={entry.user_id} className={`border-b border-gray-100 transition-colors ${idx < 3 && showScores ? 'bg-oranje-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 text-center font-semibold text-gray-500">
                    {idx < 3 && showScores ? <span className="text-xl">{MEDALS[idx]}</span> : idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.display_name}</td>

                  {tab === 'pre' && scoresZichtbaar && (
                    <>
                      <td className="px-4 py-3 text-center text-gray-700">{entry.selectie_punten ?? <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{entry.basis_xi_punten ?? <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3 text-center"><span className="font-bold text-oranje-600 text-lg">{entry.pre_totaal ?? '—'}</span></td>
                    </>
                  )}
                  {tab === 'wk' && wkScoresZichtbaar && (
                    <>
                      <td className="px-4 py-3 text-center text-gray-700">{entry.match_punten ?? <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{entry.incidents_punten ?? <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{entry.topscorer_punten ?? <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3 text-center"><span className="font-bold text-oranje-600 text-lg">{entry.wk_totaal ?? '—'}</span></td>
                    </>
                  )}
                  {tab === 'totaal' && anyScores && (
                    <>
                      {scoresZichtbaar && <td className="px-4 py-3 text-center text-gray-700">{entry.pre_totaal ?? <span className="text-gray-400">—</span>}</td>}
                      {wkScoresZichtbaar && <td className="px-4 py-3 text-center text-gray-700">{entry.wk_totaal ?? <span className="text-gray-400">—</span>}</td>}
                      <td className="px-4 py-3 text-center"><span className="font-bold text-oranje-600 text-lg">{entry.totaal ?? '—'}</span></td>
                    </>
                  )}
                  {!showScores && <td className="px-4 py-3 text-center text-gray-400">—</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
