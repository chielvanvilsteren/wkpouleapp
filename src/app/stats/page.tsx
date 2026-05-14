'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'

type Stat = { name: string; count: number; pct: number; pickers?: string[] }

// Flappy stats types
interface FlappyHighscore { display_name: string; best_score: number; games_played: number }
interface FlappyImproved { display_name: string; first_score: number; best_score: number; improvement: number }
interface FlappyConsistent { display_name: string; avg_score: number; games_played: number; best_score: number }
interface FlappyBucket { label: string; from: number; to: number; count: number }
interface FlappyStatsData {
  total_games: number
  total_players: number
  highscores: FlappyHighscore[]
  score_distribution: FlappyBucket[]
  modal_score: string | null
  mean_score: number | null
  most_improved: FlappyImproved[]
  most_consistent: FlappyConsistent[]
  lowest_score: { display_name: string; score: number; played_at: string } | null
}

interface StatsData {
  pre_locked: boolean
  wk_locked: boolean
  scores_zichtbaar: boolean
  wk_scores_zichtbaar: boolean
  official_selectie: string[]
  official_basis_xi: string[]
  total_pre?: number
  total_wk?: number
  selectie?: Stat[]
  basis_xi?: Stat[]
  wk?: {
    wereldkampioen: Stat[]
    topscorer: Stat[]
    rode_kaart: Stat[]
    gele_kaart: Stat[]
    geblesseerde: Stat[]
    eerste_goal_nl: Stat[]
  }
  profiles: { id: string; display_name: string }[]
}

function Bar({ stat, isOfficial, maxCount }: { stat: Stat; isOfficial: boolean; maxCount: number }) {
  const width = maxCount > 0 ? Math.round((stat.count / maxCount) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1 group/bar relative">
      <div className="w-44 text-sm text-right text-gray-700 truncate shrink-0">
        {stat.name}
        {isOfficial && <span className="ml-1 text-xs text-green-600 font-bold">✓</span>}
      </div>
      <div className="flex-1 relative">
        <div className="h-5 bg-gray-100 rounded-full overflow-hidden cursor-default">
          <div
            className={`h-full rounded-full ${isOfficial ? 'bg-oranje-500' : 'bg-knvb-300'}`}
            style={{ width: `${width}%` }}
          />
        </div>
        {stat.pickers && stat.pickers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/bar:block z-10 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              {stat.pickers.join(' · ')}
              <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
      </div>
      <div className="w-20 text-right text-sm shrink-0">
        <span className="font-semibold text-gray-700">{stat.pct}%</span>
        <span className="text-gray-400 text-xs ml-1">({stat.count}×)</span>
      </div>
    </div>
  )
}

function WkCard({ title, items, total }: { title: string; items: Stat[]; total: number }) {
  if (!items.length) return null
  const max = items[0].count
  return (
    <div className="card mb-4">
      <h3 className="font-bold text-gray-800 mb-3">{title}</h3>
      <p className="text-xs text-gray-400 mb-3">{total} inzendingen</p>
      {items.slice(0, 12).map(item => (
        <div key={item.name} className="flex items-center gap-3 py-1 group/wk relative">
          <div className="w-44 text-sm text-right text-gray-700 truncate shrink-0">{item.name}</div>
          <div className="flex-1 relative">
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden cursor-default">
              <div className="h-full bg-knvb-400 rounded-full" style={{ width: `${max > 0 ? Math.round((item.count / max) * 100) : 0}%` }} />
            </div>
            {item.pickers && item.pickers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/wk:block z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                  {item.pickers.join(' · ')}
                  <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            )}
          </div>
          <div className="w-20 text-right text-sm shrink-0">
            <span className="font-semibold text-gray-700">{item.pct}%</span>
            <span className="text-gray-400 text-xs ml-1">({item.count}×)</span>
          </div>
        </div>
      ))}
    </div>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']

function FlappyStatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mb-4">
      <h3 className="font-bold text-gray-800 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function FlappyPage({ flappy }: { flappy: FlappyStatsData }) {
  if (flappy.total_games === 0) {
    return (
      <div className="card text-center py-12">
        <div className="text-4xl mb-3">⚽</div>
        <p className="text-gray-500">Nog geen Flappy Bal potjes gespeeld.</p>
      </div>
    )
  }

  const maxHighscore = flappy.highscores[0]?.best_score ?? 1
  const maxBucketCount = flappy.score_distribution.length > 0
    ? Math.max(...flappy.score_distribution.map(b => b.count))
    : 1

  return (
    <>
      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card text-center py-4">
          <div className="text-3xl font-black text-oranje-500">{flappy.total_games}</div>
          <div className="text-xs text-gray-400 mt-1">potjes gespeeld</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl font-black text-oranje-500">{flappy.total_players}</div>
          <div className="text-xs text-gray-400 mt-1">unieke spelers</div>
        </div>
      </div>

      {/* Highscores */}
      <FlappyStatCard title="🏆 Highscores">
        {flappy.highscores.map((entry, idx) => (
          <div key={entry.display_name} className="flex items-center gap-3 py-1.5">
            <div className="w-7 text-center shrink-0">
              {idx < 3
                ? <span className="text-lg">{MEDALS[idx]}</span>
                : <span className="text-sm text-gray-400 font-bold">{idx + 1}</span>}
            </div>
            <div className="flex-1 relative">
              <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-oranje-400 rounded-full"
                  style={{ width: `${Math.round((entry.best_score / maxHighscore) * 100)}%` }}
                />
              </div>
            </div>
            <div className="w-32 text-sm text-gray-700 truncate text-right shrink-0">{entry.display_name}</div>
            <div className="w-16 text-right shrink-0">
              <span className="font-black text-oranje-600">{entry.best_score}</span>
              <span className="text-gray-400 text-xs ml-1">({entry.games_played}×)</span>
            </div>
          </div>
        ))}
      </FlappyStatCard>

      {/* Score verdeling */}
      {flappy.score_distribution.length > 0 && (
        <FlappyStatCard title="📊 Score verdeling">
          {/* Stat pills */}
          {(flappy.modal_score != null || flappy.mean_score != null) && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {flappy.modal_score != null && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-oranje-50 text-xs font-medium text-oranje-700">
                  <span className="text-oranje-400">▲</span>
                  Meest voorkomend: <span className="font-bold">{flappy.modal_score}</span>
                </span>
              )}
              {flappy.mean_score != null && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                  <span>⌀</span>
                  Gemiddeld: <span className="font-bold">{flappy.mean_score}</span>
                </span>
              )}
            </div>
          )}
          {/* Histogram — items-stretch (default) so children fill h-36 and % heights work */}
          <div className="flex gap-1 h-36">
            {flappy.score_distribution.map((bucket, idx) => {
              const heightPct = maxBucketCount > 0 ? Math.round((bucket.count / maxBucketCount) * 100) : 0
              const isPeak = bucket.count === maxBucketCount && bucket.count > 0
              const showLabel = idx === 0 ||
                idx === Math.floor(flappy.score_distribution.length / 2) ||
                idx === flappy.score_distribution.length - 1
              return (
                <div key={bucket.label} className="flex-1 flex flex-col justify-end h-full group/bucket relative">
                  {/* Count above bar */}
                  {bucket.count > 0 && (
                    <div className={`text-center text-xs mb-0.5 font-semibold ${isPeak ? 'text-oranje-500' : 'text-gray-400'}`}>
                      {bucket.count}
                    </div>
                  )}
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-sm transition-colors cursor-default ${
                      isPeak
                        ? 'bg-oranje-400'
                        : bucket.count > 0
                          ? 'bg-knvb-200 group-hover/bucket:bg-knvb-300'
                          : 'bg-gray-100'
                    }`}
                    style={{ height: `${Math.max(heightPct, bucket.count > 0 ? 6 : 2)}%` }}
                  />
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full mb-7 left-1/2 -translate-x-1/2 hidden group-hover/bucket:block z-10 pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                      {bucket.label}: {bucket.count}×
                    </div>
                  </div>
                  {/* X-axis label at key intervals */}
                  {showLabel && (
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                      {bucket.from}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-6" />
        </FlappyStatCard>
      )}

      {/* Meeste progressie */}
      {flappy.most_improved.length > 0 && (
        <FlappyStatCard title="📈 Meeste progressie">
          <p className="text-xs text-gray-400 mb-3">Verschil eerste → beste score</p>
          {flappy.most_improved.map((entry, idx) => (
            <div key={entry.display_name} className="flex items-center justify-between py-1.5 gap-3">
              <div className="w-7 text-center shrink-0">
                {idx < 3
                  ? <span className="text-lg">{MEDALS[idx]}</span>
                  : <span className="text-sm text-gray-400 font-bold">{idx + 1}</span>}
              </div>
              <div className="flex-1 text-sm text-gray-700 truncate">{entry.display_name}</div>
              <div className="text-right shrink-0 text-sm">
                <span className="text-gray-400">{entry.first_score}</span>
                <span className="text-gray-300 mx-1">→</span>
                <span className="font-bold text-gray-700">{entry.best_score}</span>
                <span className="ml-2 text-green-600 font-black">+{entry.improvement}</span>
              </div>
            </div>
          ))}
        </FlappyStatCard>
      )}

      {/* Meest consistent */}
      {flappy.most_consistent.length > 0 && (
        <FlappyStatCard title="🎯 Meest consistent">
          <p className="text-xs text-gray-400 mb-3">Hoogste gemiddelde score (min. 3 potjes)</p>
          {flappy.most_consistent.map((entry, idx) => (
            <div key={entry.display_name} className="flex items-center justify-between py-1.5 gap-3">
              <div className="w-7 text-center shrink-0">
                {idx < 3
                  ? <span className="text-lg">{MEDALS[idx]}</span>
                  : <span className="text-sm text-gray-400 font-bold">{idx + 1}</span>}
              </div>
              <div className="flex-1 text-sm text-gray-700 truncate">{entry.display_name}</div>
              <div className="text-right shrink-0 text-sm">
                <span className="font-black text-knvb-600">{entry.avg_score}</span>
                <span className="text-gray-400 text-xs ml-1">gem. ({entry.games_played}×)</span>
              </div>
            </div>
          ))}
        </FlappyStatCard>
      )}

      {/* Hall of shame */}
      {flappy.lowest_score && (
        <FlappyStatCard title="💀 Hall of Shame">
          <p className="text-xs text-gray-400 mb-3">Laagste score ooit</p>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-700">{flappy.lowest_score.display_name}</span>
            <span className="font-black text-red-400 text-xl">{flappy.lowest_score.score}</span>
          </div>
        </FlappyStatCard>
      )}
    </>
  )
}

type Tab = 'pre' | 'wk' | 'flappy'

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null)
  const [flappy, setFlappy] = useState<FlappyStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pre')

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/flappy-stats').then(r => r.json()),
    ]).then(([d, f]: [StatsData, FlappyStatsData]) => {
      setData(d)
      setFlappy(f)
      if (d.pre_locked && !d.wk_locked) setTab('wk')
    }).finally(() => setLoading(false))
  }, [])

  const subtitle = loading ? '' : `${data?.total_pre ?? 0} deelnemers`

  return (
    <>
      <PageHeader title="Statistieken" subtitle={subtitle} />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {loading && (
          <div className="text-center text-gray-400 animate-pulse py-12">Laden…</div>
        )}

        {!loading && data?.pre_locked && data?.wk_locked && (
          <div className="card text-center py-12">
            <div className="text-5xl mb-4">🔒</div>
            <p className="text-gray-500 font-medium">Stats worden zichtbaar na de inzendingstermijn.</p>
          </div>
        )}

        {!loading && !data?.pre_locked && (
          <>
            {/* Tabs — altijd tonen zodra pre-pool open is */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
              {(['pre', 'wk', 'flappy'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t ? 'bg-white text-knvb-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'pre' ? 'Pre-pool' : t === 'wk' ? 'WK Poule' : '⚽ Flappy Bal'}
                  </button>
                ))}
              </div>

            {/* Pre-pool stats */}
            {tab === 'pre' && (
              <>
                {data?.selectie && (
                  <div className="card mb-6">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-xl font-bold text-gray-800">Selectie</h2>
                      <span className="text-xs text-gray-400">{data.total_pre} inzendingen</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">% deelnemers dat deze speler koos</p>
                    {data.official_selectie.length > 0 && (
                      <p className="text-xs text-gray-400 mb-4">
                        <span className="text-green-600 font-bold">✓</span> = officiële selectie
                      </p>
                    )}
                    {data.selectie.map(stat => (
                      <Bar
                        key={stat.name}
                        stat={stat}
                        isOfficial={data.official_selectie.includes(stat.name)}
                        maxCount={data.total_pre ?? 1}
                      />
                    ))}
                  </div>
                )}

                {data?.basis_xi && (
                  <div className="card mb-6">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-xl font-bold text-gray-800">Basis XI</h2>
                      <span className="text-xs text-gray-400">{data.total_pre} inzendingen</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">% deelnemers dat deze speler in de basis koos</p>
                    {data.official_basis_xi.length > 0 && (
                      <p className="text-xs text-gray-400 mb-4">
                        <span className="text-green-600 font-bold">✓</span> = officiële basis XI
                      </p>
                    )}
                    {data.basis_xi.map(stat => (
                      <Bar
                        key={stat.name}
                        stat={stat}
                        isOfficial={data.official_basis_xi.includes(stat.name)}
                        maxCount={data.total_pre ?? 1}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* WK Poule stats */}
            {tab === 'wk' && (
              data?.wk_locked ? (
                <div className="card text-center py-12">
                  <div className="text-4xl mb-3">🔒</div>
                  <p className="text-gray-500">WK Poule stats zichtbaar zodra de inzendingen gesloten zijn.</p>
                </div>
              ) : data?.wk ? (
                <>
                  <WkCard title="🏆 Wereldkampioen" items={data.wk.wereldkampioen} total={data.total_wk ?? 0} />
                  <WkCard title="⚽ Topscorer WK" items={data.wk.topscorer} total={data.total_wk ?? 0} />
                  <WkCard title="🥅 Eerste goal Nederland" items={data.wk.eerste_goal_nl} total={data.total_wk ?? 0} />
                  <WkCard title="🟥 Eerste rode kaart NL" items={data.wk.rode_kaart} total={data.total_wk ?? 0} />
                  <WkCard title="🟨 Eerste gele kaart NL" items={data.wk.gele_kaart} total={data.total_wk ?? 0} />
                  <WkCard title="🚑 Eerste geblesseerde NL" items={data.wk.geblesseerde} total={data.total_wk ?? 0} />
                </>
              ) : null
            )}

            {/* Flappy Bal stats */}
            {tab === 'flappy' && (
              flappy ? <FlappyPage flappy={flappy} /> : (
                <div className="text-center text-gray-400 animate-pulse py-12">Laden…</div>
              )
            )}

            {/* Vergelijk link alleen op pre-pool tab */}
            {tab === 'pre' && (
              <div className="text-center mt-6">
                <Link href="/vergelijk" className="text-sm text-knvb-500 hover:text-knvb-600 font-medium">
                  Vergelijk twee spelers →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
