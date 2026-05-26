'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { RanglijstEntry, FlappyEntry, StickerbalEntry } from '@/types'

function useGoldMedalEgg() {
  const [show, setShow] = useState(false)
  const clicks = useRef(0)
  const lastClick = useRef(0)

  const handleClick = () => {
    const now = Date.now()
    clicks.current = now - lastClick.current < 700 ? clicks.current + 1 : 1
    lastClick.current = now
    if (clicks.current >= 3) { clicks.current = 0; setShow(true) }
  }

  return { show, dismiss: () => setShow(false), handleClick }
}

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
  flappySeason1Entries: FlappyEntry[]
  stickerbalEntries: StickerbalEntry[]
}

const MEDALS = ['🥇', '🥈', '🥉']

type Tab = 'pre' | 'wk' | 'totaal' | 'flappy' | 'stickerbal'

export default function RanglijstTabs({ entries, scoresZichtbaar, wkScoresZichtbaar, flappyEntries, flappySeason1Entries, stickerbalEntries }: Props) {
  const [tab, setTab] = useState<Tab>('totaal')
  const [flappySeason, setFlappySeason] = useState<1 | 2>(2)
  const confettiRef = useRef(false)
  const egg = useGoldMedalEgg()

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
    ? (flappySeason === 2 ? flappyEntries : flappySeason1Entries)
    : tab === 'stickerbal'
    ? stickerbalEntries
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
        {(['totaal', 'pre', 'wk', 'flappy', 'stickerbal'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-knvb-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'totaal' ? 'Gecombineerd' : t === 'pre' ? 'Pre-pool' : t === 'wk' ? 'WK Poule' : t === 'flappy' ? '⚽ Flappy Bal' : '🎮 Stickerbal'}
          </button>
        ))}
      </div>

      {tab === 'flappy' && (
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-sm font-medium ${flappySeason === 1 ? 'text-gray-800' : 'text-gray-400'}`}>Seizoen 1</span>
          <button
            onClick={() => setFlappySeason(s => s === 2 ? 1 : 2)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${flappySeason === 2 ? 'bg-knvb-500' : 'bg-gray-300'}`}
            role="switch"
            aria-checked={flappySeason === 2}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${flappySeason === 2 ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-medium ${flappySeason === 2 ? 'text-gray-800' : 'text-gray-400'}`}>Seizoen 2</span>
        </div>
      )}

      {tab !== 'flappy' && !showScores && (
        <p className="text-center text-sm text-gray-400 mb-4">
          {tab === 'pre' && 'Pre-pool scores worden zichtbaar na de officiële uitslag.'}
          {tab === 'wk' && 'WK Poule scores worden zichtbaar zodra de organisator scores publiceert.'}
          {tab === 'totaal' && 'Scores worden zichtbaar zodra de organisator ze publiceert.'}
        </p>
      )}

      {tab === 'flappy' && (flappySeason === 2 ? flappyEntries : flappySeason1Entries).length === 0 && (
        <p className="text-center text-sm text-gray-400 mb-4">Nog geen scores gespeeld.</p>
      )}
      {tab === 'stickerbal' && stickerbalEntries.length === 0 && (
        <p className="text-center text-sm text-gray-400 mb-4">Nog geen potjes gespeeld.</p>
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
                {tab === 'flappy' && <><th className="px-4 py-3 text-center font-bold">Beste score</th><th className="px-4 py-3 text-center text-gray-400 font-normal text-sm">FPS</th></>}
                {tab === 'stickerbal' && <>
                  <th className="px-4 py-3 text-center">Gespeeld</th>
                  <th className="px-4 py-3 text-center text-green-600">W</th>
                  <th className="px-4 py-3 text-center text-yellow-500">G</th>
                  <th className="px-4 py-3 text-center text-red-500">V</th>
                  <th className="px-4 py-3 text-center font-bold">Win%</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {tab === 'flappy'
                ? (flappySeason === 2 ? flappyEntries : flappySeason1Entries).map((entry, idx) => (
                    <tr key={entry.user_id} className={`border-b border-gray-100 transition-colors ${idx < 3 ? 'bg-oranje-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 text-center font-semibold text-gray-500">
                        {idx < 3 ? <span className="text-xl cursor-default select-none" onClick={idx === 0 && flappySeason === 2 ? egg.handleClick : undefined}>{MEDALS[idx]}</span> : idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{entry.display_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-oranje-600 text-lg">{entry.best_score}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.best_fps != null
                          ? <span className={`text-xs font-mono ${entry.best_fps < 50 ? 'text-red-400' : 'text-gray-400'}`}>{entry.best_fps}</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))
                : tab === 'stickerbal'
                ? stickerbalEntries.map((entry, idx) => {
                    const winPct = entry.games > 0 ? Math.round((entry.wins / entry.games) * 100) : 0
                    return (
                      <tr key={entry.display_name} className={`border-b border-gray-100 transition-colors ${idx < 3 ? 'bg-oranje-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3 text-center font-semibold text-gray-500">
                          {idx < 3 ? <span className="text-xl">{MEDALS[idx]}</span> : idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{entry.display_name}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{entry.games}</td>
                        <td className="px-4 py-3 text-center font-bold text-green-600">{entry.wins}</td>
                        <td className="px-4 py-3 text-center text-yellow-600">{entry.draws}</td>
                        <td className="px-4 py-3 text-center text-red-500">{entry.losses}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-black text-lg ${winPct >= 60 ? 'text-oranje-600' : winPct >= 40 ? 'text-knvb-500' : 'text-gray-400'}`}>{winPct}%</span>
                        </td>
                      </tr>
                    )
                  })
                : (sorted as RanglijstEntry[]).map((entry, idx) => (
                    <tr key={entry.user_id} className={`border-b border-gray-100 transition-colors ${idx < 3 && showScores ? 'bg-oranje-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 text-center font-semibold text-gray-500">
                        {idx < 3 && showScores ? <span className="text-xl cursor-default select-none" onClick={idx === 0 ? egg.handleClick : undefined}>{MEDALS[idx]}</span> : idx + 1}
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

      {egg.show && (
        <div className="fixed bottom-5 right-5 z-50 bg-knvb-700 text-white rounded-2xl shadow-2xl p-5 max-w-xs animate-[slideUp_0.3s_ease]">
          <p className="text-2xl mb-1">🎮</p>
          <p className="font-bold text-base mb-1">Geheim spel gevonden!</p>
          <p className="text-sm text-white/70 mb-4">
            Denk je dat jij ook kampioen kan worden? Bewijs het!
          </p>
          <div className="flex gap-2">
            <Link href="/spel"
              className="flex-1 text-center py-2 rounded-xl bg-oranje-500 hover:bg-oranje-600 text-white text-sm font-bold transition-colors">
              Spelen →
            </Link>
            <button onClick={egg.dismiss}
              className="px-3 py-2 rounded-xl text-white/50 hover:text-white text-sm transition-colors">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
