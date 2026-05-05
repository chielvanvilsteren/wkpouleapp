import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — haal globale top-30 scores op (met display_name via manual join)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: scores, error } = await supabase
    .from('flappy_scores')
    .select('id, score, played_at, user_id')
    .order('score', { ascending: false })
    .order('played_at', { ascending: true })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!scores || scores.length === 0) return NextResponse.json([])

  const userIds = [...new Set(scores.map((s) => s.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)

  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))
  const data = scores.map((s) => ({ ...s, display_name: nameMap.get(s.user_id) ?? null }))

  return NextResponse.json(data)
}
