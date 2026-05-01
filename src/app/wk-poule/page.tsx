import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WkPouleForm from '@/components/WkPouleForm'
import type { Match, MatchPrediction, WkIncidentsPrediction } from '@/types'

export const dynamic = 'force-dynamic'

export default async function WkPoulePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('is_deelnemer')
    .eq('id', user.id)
    .single()

  if ((profileRaw as { is_deelnemer: boolean } | null)?.is_deelnemer === false) {
    redirect('/admin')
  }

  const [
    { data: matchesRaw },
    { data: predictionsRaw },
    { data: incidentsRaw },
    { data: uitslagRaw },
  ] = await Promise.all([
    supabase.from('matches').select('*').order('match_number', { ascending: true }),
    supabase.from('match_predictions').select('*').eq('user_id', user.id),
    supabase.from('wk_incidents_predictions').select('*').eq('user_id', user.id).single(),
    supabase.from('master_uitslag').select('wk_poule_open').eq('id', 1).single(),
  ])

  const matches = (matchesRaw ?? []) as Match[]
  const predictions = (predictionsRaw ?? []) as MatchPrediction[]
  const incidents = incidentsRaw as WkIncidentsPrediction | null
  const isOpen = (uitslagRaw as { wk_poule_open: boolean } | null)?.wk_poule_open ?? true

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-knvb-500 mb-1">WK Poule</h1>
        <p className="text-gray-600">
          Voorspel de uitslag van alle {matches.length} WK-wedstrijden.{' '}
          {isOpen ? (
            <span className="text-green-600 font-medium">Inzendingen zijn open. ✅</span>
          ) : (
            <span className="text-amber-600 font-medium">Inzendingen zijn gesloten. ⚠️</span>
          )}
        </p>
      </div>

      <WkPouleForm
        matches={matches}
        initialPredictions={predictions}
        initialIncidents={incidents}
        isOpen={isOpen}
      />
    </div>
  )
}
