'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'

type Stat = { name: string; count: number; pct: number; pickers?: string[] }

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

type Tab = 'pre' | 'wk'

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pre')

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then((d: StatsData) => {
        setData(d)
        if (d.pre_locked && !d.wk_locked) setTab('wk')
      })
      .finally(() => setLoading(false))
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
              {(['pre', 'wk'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t ? 'bg-white text-knvb-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'pre' ? 'Pre-pool' : 'WK Poule'}
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
