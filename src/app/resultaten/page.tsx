import { createClient } from '@supabase/supabase-js'
import PageHeader from '@/components/PageHeader'

export const dynamic = 'force-dynamic'

interface Row { display_name: string; result: 'win' | 'loss' | 'draw' }
interface PlayerStat {
  display_name: string
  games: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default async function ResultatenPage() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: raw } = await db
    .from('stickerbal_results')
    .select('display_name, result, goals_for, goals_against')

  // Aggregate by display_name (case-insensitive)
  const map = new Map<string, PlayerStat>()
  for (const r of (raw ?? []) as (Row & { goals_for: number; goals_against: number })[]) {
    const key = r.display_name.toLowerCase()
    const existing = map.get(key) ?? { display_name: r.display_name, games: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0 }
    existing.games++
    if (r.result === 'win') existing.wins++
    else if (r.result === 'draw') existing.draws++
    else existing.losses++
    existing.goals_for += r.goals_for ?? 0
    existing.goals_against += r.goals_against ?? 0
    map.set(key, existing)
  }

  const stats = Array.from(map.values())
    .sort((a, b) => b.wins - a.wins || b.draws - a.draws || b.goals_for - a.goals_for)

  return (
    <>
      <PageHeader title="Stickerbal Resultaten" subtitle={`${stats.length} spelers`} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {stats.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">⚽</div>
            <p className="text-gray-500">Nog geen gespeelde potjes.</p>
            <p className="text-sm text-gray-400 mt-1">Speel je eerste potje via de easter egg op de homepage!</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-knvb-500 text-white text-sm">
                  <th className="px-4 py-3 text-left w-12">#</th>
                  <th className="px-4 py-3 text-left">Naam</th>
                  <th className="px-4 py-3 text-center">Gespeeld</th>
                  <th className="px-4 py-3 text-center text-green-300">W</th>
                  <th className="px-4 py-3 text-center text-yellow-300">G</th>
                  <th className="px-4 py-3 text-center text-red-300">V</th>
                  <th className="px-4 py-3 text-center">Goals</th>
                  <th className="px-4 py-3 text-center font-bold">Win%</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((p, idx) => {
                  const winPct = p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0
                  return (
                    <tr key={p.display_name} className={`border-b border-gray-100 transition-colors ${idx < 3 ? 'bg-oranje-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 text-center font-semibold text-gray-400">
                        {idx < 3 ? <span className="text-xl">{MEDALS[idx]}</span> : idx + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.display_name}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{p.games}</td>
                      <td className="px-4 py-3 text-center font-bold text-green-600">{p.wins}</td>
                      <td className="px-4 py-3 text-center text-yellow-600">{p.draws}</td>
                      <td className="px-4 py-3 text-center text-red-500">{p.losses}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">
                        {p.goals_for}–{p.goals_against}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-black text-lg ${winPct >= 60 ? 'text-oranje-600' : winPct >= 40 ? 'text-knvb-500' : 'text-gray-400'}`}>
                          {winPct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
