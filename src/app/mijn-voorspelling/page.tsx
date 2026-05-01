import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PredictieForm from '@/components/PredictieForm'
import PageHeader from '@/components/PageHeader'
import DeadlineCountdown from '@/components/DeadlineCountdown'
import type { Prediction, Score } from '@/types'

export const dynamic = 'force-dynamic'

export default async function MijnVoorspellingPage() {
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
    { data: predictionRaw },
    { data: uitslagRaw },
    { data: scoreRaw },
  ] = await Promise.all([
    supabase.from('predictions').select('*').eq('user_id', user.id).single(),
    supabase.from('master_uitslag').select('inzendingen_open, inzendingen_deadline, scores_zichtbaar').eq('id', 1).single(),
    supabase.from('scores').select('*').eq('user_id', user.id).single(),
  ])

  const prediction = predictionRaw as Prediction | null
  const uitslag = uitslagRaw as { inzendingen_open: boolean; inzendingen_deadline: string | null; scores_zichtbaar: boolean } | null
  const score = scoreRaw as Score | null

  const now = new Date()
  const deadline = uitslag?.inzendingen_deadline ? new Date(uitslag.inzendingen_deadline) : null
  const deadlinePassed = deadline !== null && now >= deadline
  const isOpen = (uitslag?.inzendingen_open ?? true) && !deadlinePassed
  const scoresZichtbaar = uitslag?.scores_zichtbaar ?? false

  const statusNode = deadlinePassed
    ? <span className="text-red-300 font-medium">Deadline verstreken ⛔</span>
    : isOpen
      ? deadline
        ? <span className="text-green-300 font-medium">Open tot {deadline.toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ✅</span>
        : <span className="text-green-300 font-medium">Inzendingen open ✅</span>
      : <span className="text-amber-300 font-medium">Inzendingen gesloten ⚠️</span>

  return (
    <>
      <PageHeader
        title="Pre-Pool Voorspelling"
        badge="Pre-Pool"
        subtitle={<>Selectie (26 spelers) + Basis XI — maximaal 37 punten &middot; {statusNode}</>}
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {deadline && !deadlinePassed && (
          <div className="mb-6">
            <DeadlineCountdown deadlineIso={deadline.toISOString()} />
          </div>
        )}
        <PredictieForm
          initialPrediction={prediction}
          isOpen={isOpen}
          score={scoresZichtbaar ? score : null}
        />
      </div>
    </>
  )
}
