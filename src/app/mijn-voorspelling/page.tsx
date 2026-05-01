import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PredictieForm from '@/components/PredictieForm'
import type { Prediction, Score } from '@/types'

export const dynamic = 'force-dynamic'

export default async function MijnVoorspellingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: predictionRaw },
    { data: uitslagRaw },
    { data: scoreRaw },
  ] = await Promise.all([
    supabase.from('predictions').select('*').eq('user_id', user.id).single(),
    supabase.from('master_uitslag').select('inzendingen_open, scores_zichtbaar').eq('id', 1).single(),
    supabase.from('scores').select('*').eq('user_id', user.id).single(),
  ])

  const prediction = predictionRaw as Prediction | null
  const uitslag = uitslagRaw as { inzendingen_open: boolean; scores_zichtbaar: boolean } | null
  const score = scoreRaw as Score | null

  const isOpen = uitslag?.inzendingen_open ?? true
  const scoresZichtbaar = uitslag?.scores_zichtbaar ?? false

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-knvb-500 mb-1">Mijn Voorspelling</h1>
        <p className="text-gray-600">
          Vul hieronder je voorspellingen in.{' '}
          {isOpen ? (
            <span className="text-green-600 font-medium">Inzendingen zijn open. ✅</span>
          ) : (
            <span className="text-amber-600 font-medium">Inzendingen zijn gesloten. ⚠️</span>
          )}
        </p>
      </div>

      <PredictieForm
        initialPrediction={prediction}
        isOpen={isOpen}
        score={scoresZichtbaar ? score : null}
      />
    </div>
  )
}
