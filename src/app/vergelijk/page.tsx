'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'

type Profile = { id: string; display_name: string }
type Scores = { selectie_punten: number; basis_xi_punten: number; totaal: number } | null
type WkScores = { match_punten: number; incidents_punten: number; topscorer_punten: number; toernooi_punten: number; totaal: number } | null
type Incidents = Record<string, string> | null
type Overlap = { both: string[]; only_a: string[]; only_b: string[] }

interface UserData {
  id: string
  display_name: string
  scores: Scores
  wk_scores: WkScores
  selectie: string[] | null
  basis_xi: string[] | null
  incidents: Incidents
}

interface VergelijkData {
  scoresVisible: boolean
  wkVisible: boolean
  profiles?: Profile[]
  a?: UserData
  b?: UserData
  overlap?: { selectie: Overlap; basis_xi: Overlap } | null
  error?: string
}

function ScoreRow({ label, valA, valB }: { label: string; valA: number | null; valB: number | null }) {
  const a = valA ?? 0
  const b = valB ?? 0
  const aWins = a > b
  const bWins = b > a
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-2 text-sm text-gray-600 text-center w-24">
        <span className={`font-bold text-lg ${aWins ? 'text-oranje-500' : 'text-gray-400'}`}>{valA ?? '—'}</span>
      </td>
      <td className="px-4 py-2 text-sm text-gray-500 text-center">{label}</td>
      <td className="px-4 py-2 text-sm text-gray-600 text-center w-24">
        <span className={`font-bold text-lg ${bWins ? 'text-oranje-500' : 'text-gray-400'}`}>{valB ?? '—'}</span>
      </td>
    </tr>
  )
}

function OverlapSection({ nameA, nameB, overlap, title }: { nameA: string; nameB: string; overlap: Overlap; title: string }) {
  return (
    <div className="card mb-4">
      <h3 className="font-bold text-gray-800 mb-4">{title}</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-semibold text-oranje-500 mb-2 truncate">Alleen {nameA}</p>
          {overlap.only_a.length === 0
            ? <p className="text-xs text-gray-400">—</p>
            : overlap.only_a.map(p => <p key={p} className="text-sm text-gray-700 py-0.5">{p}</p>)
          }
        </div>
        <div>
          <p className="text-xs font-semibold text-green-600 mb-2">Allebei</p>
          {overlap.both.length === 0
            ? <p className="text-xs text-gray-400">—</p>
            : overlap.both.map(p => <p key={p} className="text-sm text-gray-700 py-0.5">{p}</p>)
          }
        </div>
        <div>
          <p className="text-xs font-semibold text-knvb-500 mb-2 truncate">Alleen {nameB}</p>
          {overlap.only_b.length === 0
            ? <p className="text-xs text-gray-400">—</p>
            : overlap.only_b.map(p => <p key={p} className="text-sm text-gray-700 py-0.5">{p}</p>)
          }
        </div>
      </div>
      <div className="flex justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
        <span>{overlap.only_a.length} uniek</span>
        <span className="text-green-600 font-medium">{overlap.both.length} gemeenschappelijk</span>
        <span>{overlap.only_b.length} uniek</span>
      </div>
    </div>
  )
}

function IncidentRow({ label, valA, valB }: { label: string; valA: string | null; valB: string | null }) {
  const match = valA && valB && valA.trim().toLowerCase() === valB.trim().toLowerCase()
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-2 text-sm text-center text-gray-700">{valA || <span className="text-gray-300">—</span>}</td>
      <td className="px-4 py-2 text-xs text-gray-400 text-center whitespace-nowrap">
        {match ? <span className="text-green-600 font-medium">✓ zelfde</span> : label}
      </td>
      <td className="px-4 py-2 text-sm text-center text-gray-700">{valB || <span className="text-gray-300">—</span>}</td>
    </tr>
  )
}

function VergelijkInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const aId = searchParams.get('a') ?? ''
  const bId = searchParams.get('b') ?? ''

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [data, setData] = useState<VergelijkData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selA, setSelA] = useState(aId)
  const [selB, setSelB] = useState(bId)

  // Load profiles on mount
  useEffect(() => {
    fetch('/api/vergelijk')
      .then(r => r.json())
      .then((d: VergelijkData) => setProfiles(d.profiles ?? []))
  }, [])

  // Load comparison when both IDs present in URL
  useEffect(() => {
    if (!aId || !bId) { setData(null); return }
    setLoading(true)
    fetch(`/api/vergelijk?a=${aId}&b=${bId}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [aId, bId])

  const handleCompare = () => {
    if (selA && selB && selA !== selB) {
      router.push(`/vergelijk?a=${selA}&b=${selB}`)
    }
  }

  const nameA = data?.a?.display_name ?? profiles.find(p => p.id === selA)?.display_name ?? 'Speler A'
  const nameB = data?.b?.display_name ?? profiles.find(p => p.id === selB)?.display_name ?? 'Speler B'

  return (
    <>
      <PageHeader title="Head-to-head" subtitle="Vergelijk twee spelers" />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Selector */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={selA}
              onChange={e => setSelA(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 w-full"
            >
              <option value="">Kies speler A…</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === selB}>{p.display_name}</option>
              ))}
            </select>

            <span className="text-gray-400 font-bold text-sm shrink-0">vs</span>

            <select
              value={selB}
              onChange={e => setSelB(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 w-full"
            >
              <option value="">Kies speler B…</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === selA}>{p.display_name}</option>
              ))}
            </select>

            <button
              onClick={handleCompare}
              disabled={!selA || !selB || selA === selB}
              className="px-5 py-2 rounded-lg bg-oranje-500 hover:bg-oranje-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              Vergelijk
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-gray-400 animate-pulse py-12">Laden…</div>
        )}

        {!loading && data?.error && (
          <div className="card text-center py-8 text-red-500">{data.error}</div>
        )}

        {!loading && data?.a && data?.b && (
          <>
            {/* Score vergelijking */}
            {(data.scoresVisible || data.wkVisible) ? (
              <div className="card mb-4 p-0 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-knvb-500 text-white">
                      <th className="px-4 py-3 text-center text-sm font-bold w-1/3 truncate">{nameA}</th>
                      <th className="px-4 py-3 text-center text-sm text-white/60 w-1/3">Score</th>
                      <th className="px-4 py-3 text-center text-sm font-bold w-1/3 truncate">{nameB}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.scoresVisible && data.a.scores && data.b.scores && (
                      <>
                        <ScoreRow label="Selectie goed" valA={data.a.scores.selectie_punten} valB={data.b.scores.selectie_punten} />
                        <ScoreRow label="Basis XI score" valA={data.a.scores.basis_xi_punten} valB={data.b.scores.basis_xi_punten} />
                        <tr className="border-b border-gray-200 bg-oranje-50">
                          <td className="px-4 py-2 text-center">
                            <span className="font-black text-xl text-oranje-600">{data.a.scores.totaal}</span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500 text-center font-semibold">Pre-pool totaal</td>
                          <td className="px-4 py-2 text-center">
                            <span className="font-black text-xl text-oranje-600">{data.b.scores.totaal}</span>
                          </td>
                        </tr>
                      </>
                    )}
                    {data.wkVisible && data.a.wk_scores && data.b.wk_scores && (
                      <>
                        <ScoreRow label="Wedstrijden" valA={data.a.wk_scores.match_punten} valB={data.b.wk_scores.match_punten} />
                        <ScoreRow label="Incidents" valA={data.a.wk_scores.incidents_punten} valB={data.b.wk_scores.incidents_punten} />
                        <ScoreRow label="Topscorer" valA={data.a.wk_scores.topscorer_punten} valB={data.b.wk_scores.topscorer_punten} />
                        <ScoreRow label="Toernooi" valA={data.a.wk_scores.toernooi_punten} valB={data.b.wk_scores.toernooi_punten} />
                        <tr className="border-b border-gray-200 bg-oranje-50">
                          <td className="px-4 py-2 text-center">
                            <span className="font-black text-xl text-oranje-600">{data.a.wk_scores.totaal}</span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500 text-center font-semibold">WK totaal</td>
                          <td className="px-4 py-2 text-center">
                            <span className="font-black text-xl text-oranje-600">{data.b.wk_scores.totaal}</span>
                          </td>
                        </tr>
                      </>
                    )}
                    {data.scoresVisible && data.wkVisible && (
                      <tr className="bg-knvb-50">
                        <td className="px-4 py-3 text-center">
                          <span className="font-black text-2xl text-knvb-600">
                            {(data.a.scores?.totaal ?? 0) + (data.a.wk_scores?.totaal ?? 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center font-bold">Gecombineerd</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-black text-2xl text-knvb-600">
                            {(data.b.scores?.totaal ?? 0) + (data.b.wk_scores?.totaal ?? 0)}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card mb-4 text-center py-8 text-gray-400 text-sm">
                Scores worden zichtbaar zodra de organisator ze publiceert.
              </div>
            )}

            {/* WK Incidents vergelijking */}
            {data.wkVisible && (data.a.incidents || data.b.incidents) && (
              <div className="card mb-4 p-0 overflow-hidden">
                <div className="bg-knvb-500 px-4 py-3">
                  <h3 className="text-white font-bold text-sm text-center">WK Voorspellingen</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 truncate">{nameA}</th>
                      <th className="px-4 py-2 text-center text-xs text-gray-400 w-32"></th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 truncate">{nameB}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <IncidentRow label="🏆 Kampioen" valA={data.a.incidents?.wereldkampioen ?? null} valB={data.b.incidents?.wereldkampioen ?? null} />
                    <IncidentRow label="⚽ Topscorer" valA={data.a.incidents?.topscorer_wk ?? null} valB={data.b.incidents?.topscorer_wk ?? null} />
                    <IncidentRow label="🥅 1e goal NL" valA={data.a.incidents?.eerste_goal_nl ?? null} valB={data.b.incidents?.eerste_goal_nl ?? null} />
                    <IncidentRow label="🟥 Rode kaart" valA={data.a.incidents?.rode_kaart ?? null} valB={data.b.incidents?.rode_kaart ?? null} />
                    <IncidentRow label="🟨 Gele kaart" valA={data.a.incidents?.gele_kaart ?? null} valB={data.b.incidents?.gele_kaart ?? null} />
                    <IncidentRow label="🚑 Geblesseerd" valA={data.a.incidents?.geblesseerde ?? null} valB={data.b.incidents?.geblesseerde ?? null} />
                    <IncidentRow label="🏟️ Finalist 1" valA={data.a.incidents?.finale_team1 ?? null} valB={data.b.incidents?.finale_team1 ?? null} />
                    <IncidentRow label="🏟️ Finalist 2" valA={data.a.incidents?.finale_team2 ?? null} valB={data.b.incidents?.finale_team2 ?? null} />
                  </tbody>
                </table>
              </div>
            )}

            {/* Player overlap */}
            {data.overlap && (
              <>
                <OverlapSection nameA={nameA} nameB={nameB} overlap={data.overlap.selectie} title="Selectie overlap (26 spelers)" />
                <OverlapSection nameA={nameA} nameB={nameB} overlap={data.overlap.basis_xi} title="Basis XI overlap" />
              </>
            )}

            {!data.scoresVisible && !data.wkVisible && !data.overlap && (
              <div className="card text-center py-8 text-gray-400 text-sm">
                Voorspellingen zichtbaar na score-publicatie.
              </div>
            )}
          </>
        )}

        {!loading && !aId && !bId && profiles.length > 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Kies twee spelers om te vergelijken.
          </div>
        )}

        <div className="text-center mt-6">
          <Link href="/stats" className="text-sm text-knvb-500 hover:text-knvb-600 font-medium">
            ← Statistieken
          </Link>
        </div>
      </div>
    </>
  )
}

export default function VergelijkPage() {
  return (
    <Suspense fallback={null}>
      <VergelijkInner />
    </Suspense>
  )
}
