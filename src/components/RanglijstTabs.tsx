'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { RanglijstEntry, FlappyEntry } from '@/types'

function launchConfetti() {
  const style = document.createElement('style')
  style.textContent = `@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}80%{opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:0}}`
  document.head.appendChild(style)

  const colors = ['#FF6200', '#003082', '#FFD700', '#ffffff', '#FF8C33', '#5782FF']
  const pieces: HTMLElement[] = []
  for (let i = 0; i < 110; i++) {
    const el = document.createElement('div')
    const size = 6 + Math.random() * 10
    el.style.cssText = `position:fixed;left:${Math.random()*100}vw;top:-20px;width:${size}px;height:${size*(0.5+Math.random())}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'2px'};pointer-events:none;z-index:9999;animation:confettiFall ${2.5+Math.random()*3}s ${Math.random()*2.5}s ease-in forwards`
    document.body.appendChild(el)
    pieces.push(el)
  }
  setTimeout(() => { pieces.forEach(e => e.remove()); style.remove() }, 7000)
}

type Props = {
  entries: RanglijstEntry[]
  scoresZichtbaar: boolean
  wkScoresZichtbaar: boolean
  flappyEntries: FlappyEntry[]
}

const MEDALS = ['🥇', '🥈', '🥉']

type Tab = 'pre' | 'wk' | 'totaal' | 'flappy'

export default function RanglijstTabs({ entries, scoresZichtbaar, wkScoresZichtbaar, flappyEntries }: Props) {
  const [tab, setTab] = useState<Tab>('totaal')
  const confettiRef = useRef(false)

  useEffect(() => {
    if (!(scoresZichtbaar || wkScoresZichtbaar)) return
    const key = 'scoreRevealSeen_v1'
    if (!confettiRef.current && !localStorage.getItem(key)) {
      confettiRef.current = true
      localStorage.setItem(key, '1')
      launchConfetti()
    }
  }, [scoresZichtbaar, wkScoresZichtbaar])

  const sorted = tab === 'flappy'
    ? flappyEntries
    : [...entries].sort((a, b) => {
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
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {(['totaal', 'pre', 'wk', 'flappy'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-knvb-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'totaal' ? 'Gecombineerd' : t === 'pre' ? 'Pre-pool' : t === 'wk' ? 'WK Poule' : '⚽ Flappy Bal'}
          </button>
        ))}
      </div>

      {tab !== 'flappy' && !showScores && (
        <p className="text-center text-sm text-gray-400 mb-4">
          {tab === 'pre' && 'Pre-pool scores worden zichtbaar na de officiële uitslag.'}
          {tab === 'wk' && 'WK Poule scores worden zichtbaar zodra de organisator scores publiceert.'}
          {tab === 'totaal' && 'Scores worden zichtbaar zodra de organisator ze publiceert.'}
        </p>
      )}

      {tab === 'flappy' && flappyEntries.length === 0 && (
        <p className="text-center text-sm text-gray-400 mb-4">Nog geen scores gespeeld.</p>
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
                    <th className="px-4 py-3 text-center">Toernooi</th>
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
                {tab !== 'flappy' && !showScores && <th className="px-4 py-3 text-center">Score</th>}
                {tab === 'flappy' && <th className="px-4 py-3 text-center font-bold">Beste score</th>}
              </tr>
            </thead>
            <tbody>
              {tab === 'flappy'
                ? flappyEntries.map((entry, idx) => (
                    <tr key={entry.user_id} className={`border-b border-gray-100 transition-colors ${idx < 3 ? 'bg-oranje-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 text-center font-semibold text-gray-500">
                        {idx < 3 ? <span className="text-xl">{MEDALS[idx]}</span> : idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{entry.display_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-oranje-600 text-lg">{entry.best_score}</span>
                      </td>
                    </tr>
                  ))
                : (sorted as RanglijstEntry[]).map((entry, idx) => (
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
                          <td className="px-4 py-3 text-center text-gray-700">{entry.toernooi_punten ?? <span className="text-gray-400">—</span>}</td>
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
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Link href="/vergelijk" className="text-xs text-gray-400 hover:text-knvb-500 transition-colors">
          Vergelijk spelers →
        </Link>
      </div>
    </div>
  )
}
