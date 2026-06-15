import { createClient } from '@/lib/supabase/server'
import { createClient as createApiClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { countMatches } from '@/lib/scoring-utils'
import { sendPushToUser } from '@/lib/push'

export async function POST() {
  const userSupabase = await createClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await userSupabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase service-role configuratie ontbreekt.' }, { status: 500 })
  }

  const supabase = createApiClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: uitslag, error: uitslagError } = await supabase.from('master_uitslag').select('*').eq('id', 1).single()
  if (uitslagError || !uitslag) return NextResponse.json({ error: uitslagError ? `Master uitslag fout: ${uitslagError.message} (${uitslagError.code})` : 'Master uitslag niet gevonden.' }, { status: 400 })

  const { data: predictions, error: predError } = await supabase.from('predictions').select('*')
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

  const { error: upsertError } = await supabase.from('scores').upsert(upsertData, { onConflict: 'user_id' })
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  // Grant Flappy Bal credits: delete old pre-poule grants, insert fresh ones
  const { error: deleteCreditsError } = await supabase
    .from('flappy_credit_grants')
    .delete()
    .eq('note', 'pre-poule')
    .eq('season', 2)
  if (deleteCreditsError) {
    return NextResponse.json({ error: `Flappy credits resetten mislukt: ${deleteCreditsError.message}` }, { status: 500 })
  }

  const creditGrants = upsertData
    .filter((row) => row.totaal > 0)
    .map((row) => ({
      user_id: row.user_id,
      granted_by: user.id,
      amount: row.totaal,
      note: 'pre-poule',
      season: 2,
    }))
  if (creditGrants.length > 0) {
    const { error: insertCreditsError } = await supabase.from('flappy_credit_grants').insert(creditGrants)
    if (insertCreditsError) {
      return NextResponse.json({ error: `Flappy credits toekennen mislukt: ${insertCreditsError.message}` }, { status: 500 })
    }
  }

  // Push notifications fire-and-forget
  for (const row of upsertData) {
    if (row.totaal > 0) {
      sendPushToUser(supabase, row.user_id, {
        title: '⚽ Pre Poule scores bijgewerkt!',
        body: `Jouw score: ${row.totaal} punten · Je hebt ${row.totaal} Flappy Bal credits verdiend`,
        url: '/ranglijst',
      }).catch(() => {/* ignore */})
    }
  }

  const grantedCredits = creditGrants.reduce((sum, grant) => sum + grant.amount, 0)

  return NextResponse.json({
    message: `Scores berekend voor ${upsertData.length} deelnemers. ${grantedCredits} Flappy credits toegekend.`,
    count: upsertData.length,
    grantedCredits,
  })
}
