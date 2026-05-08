import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types'
import { normalize, countMatches } from '@/lib/scoring-utils'
import { sendPushToUser } from '@/lib/push'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: uitslag, error: uitslagError } = await admin.from('master_uitslag').select('*').eq('id', 1).single()
  if (uitslagError || !uitslag) return NextResponse.json({ error: 'Master uitslag niet gevonden.' }, { status: 400 })

  const { data: predictions, error: predError } = await admin.from('predictions').select('*')
  if (predError) return NextResponse.json({ error: predError.message }, { status: 500 })
  if (!predictions || predictions.length === 0) return NextResponse.json({ message: 'Geen voorspellingen om te berekenen.' })

  const upsertData = predictions.map((pred) => {
    const selectiePunten = countMatches(pred.selectie ?? [], uitslag.selectie ?? [])
    const basisXiPunten = countMatches(pred.basis_xi ?? [], uitslag.basis_xi ?? [])
    const totaal = selectiePunten + basisXiPunten

    return {
      user_id: pred.user_id,
      selectie_punten: selectiePunten,
      basis_xi_punten: basisXiPunten,
      totaal,
      updated_at: new Date().toISOString(),
    }
  })

  const { error: upsertError } = await admin.from('scores').upsert(upsertData, { onConflict: 'user_id' })
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  // Push notifications fire-and-forget
  for (const row of upsertData) {
    const credits = row.selectie_punten + row.basis_xi_punten
    if (credits > 0) {
      sendPushToUser(row.user_id, {
        title: '⚽ Pre Poule scores bijgewerkt!',
        body: `Jouw score: ${row.totaal} punten · Je hebt ${credits} Flappy Bal credits verdiend`,
        url: '/ranglijst',
      }).catch(() => {/* ignore */})
    }
  }

  return NextResponse.json({ message: `Scores berekend voor ${upsertData.length} deelnemers.`, count: upsertData.length })
}
