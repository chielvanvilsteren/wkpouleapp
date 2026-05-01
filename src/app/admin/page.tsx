import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminUitslagForm from '@/components/AdminUitslagForm'
import AdminToggles from '@/components/AdminToggles'
import type { MasterUitslag, Prediction, Profile } from '@/types'

export const dynamic = 'force-dynamic'

const DEFAULT_UITSLAG: MasterUitslag = {
  id: 1,
  selectie: [],
  basis_xi: [],
  rode_kaart: '',
  gele_kaart: '',
  geblesseerde: '',
  eerste_goal: '',
  inzendingen_open: true,
  scores_zichtbaar: false,
  updated_at: new Date().toISOString(),
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as Profile | null
  if (!profile?.is_admin) redirect('/')

  const [{ data: uitslagRaw }, { data: predictionsRaw }, { data: profilesRaw }] = await Promise.all([
    supabase.from('master_uitslag').select('*').eq('id', 1).single(),
    supabase.from('predictions').select('user_id, updated_at'),
    supabase.from('profiles').select('id, display_name'),
  ])

  const uitslag = uitslagRaw as MasterUitslag | null
  const predictions = (predictionsRaw ?? []) as Pick<Prediction, 'user_id' | 'updated_at'>[]
  const profiles = (profilesRaw ?? []) as Pick<Profile, 'id' | 'display_name'>[]

  const effectiveUitslag: MasterUitslag = uitslag ?? DEFAULT_UITSLAG

  const predictionMap = new Map(predictions.map((p) => [p.user_id, p.updated_at]))

  const deelnemers = profiles
    .filter((p) => p.id !== user.id)
    .map((p) => ({
      ...p,
      heeftIngevuld: predictionMap.has(p.id),
      ingevuldOp: predictionMap.get(p.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.heeftIngevuld !== b.heeftIngevuld) return a.heeftIngevuld ? -1 : 1
      return a.display_name.localeCompare(b.display_name, 'nl')
    })

  const aantalIngevuld = deelnemers.filter((d) => d.heeftIngevuld).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-oranje-500 text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
          Admin
        </div>
        <h1 className="text-3xl font-bold text-knvb-500">Dashboard</h1>
      </div>

      <div className="grid gap-8">
        {/* Beheer toggles */}
        <div className="card">
          <h2 className="section-title">Beheer</h2>
          <AdminToggles
            inzendingen_open={effectiveUitslag.inzendingen_open}
            scores_zichtbaar={effectiveUitslag.scores_zichtbaar}
          />
        </div>

        {/* Deelnemers overzicht */}
        <div className="card">
          <h2 className="section-title">
            Deelnemers — {aantalIngevuld} / {deelnemers.length} ingevuld
          </h2>
          {deelnemers.length === 0 ? (
            <p className="text-gray-500 text-sm">Nog geen deelnemers.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-600 font-medium">Naam</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-medium">Status</th>
                    <th className="text-right py-2 px-3 text-gray-600 font-medium">Ingevuld op</th>
                  </tr>
                </thead>
                <tbody>
                  {deelnemers.map((d) => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{d.display_name}</td>
                      <td className="py-2 px-3 text-center">
                        {d.heeftIngevuld ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            ✓ Ingevuld
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
                            Niet ingevuld
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        {d.ingevuldOp
                          ? new Date(d.ingevuldOp).toLocaleString('nl-NL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Master uitslag */}
        <div className="card">
          <h2 className="section-title">Master Uitslag Invullen</h2>
          <p className="text-sm text-gray-600 mb-6">
            Vul de officiële WK-gegevens in en klik op opslaan. Scores worden direct herberekend.
          </p>
          <AdminUitslagForm uitslag={effectiveUitslag} />
        </div>
      </div>
    </div>
  )
}
