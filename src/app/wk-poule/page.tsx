import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WkPouleForm from '@/components/WkPouleForm'
import PageHeader from '@/components/PageHeader'
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

  const statusNode = isOpen
    ? <span className="text-green-300 font-medium">Inzendingen open ✅</span>
    : <span className="text-amber-300 font-medium">Inzendingen gesloten ⚠️</span>

  return (
    <>
      <PageHeader
        title="WK Poule"
        badge="WK Poule"
        subtitle={<>{matches.length} wedstrijden · 3pt exact · 1pt resultaat · incidenten &amp; topscorer &middot; {statusNode}</>}
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <WkPouleForm
          matches={matches}
          initialPredictions={predictions}
          initialIncidents={incidents}
          isOpen={isOpen}
          now={new Date().toISOString()}
        />
      </div>
    </>
  )
}
