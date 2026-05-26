import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data } = await admin
    .from('flappy_suspicious_attempts')
    .select('id, user_id, session_id, submitted_score, server_elapsed_ms, minimum_ms, client_duration_ms, fps, created_at')
    .order('created_at', { ascending: false })
    .limit(100) as { data: Array<{
      id: string; user_id: string; session_id: string; submitted_score: number;
      server_elapsed_ms: number; minimum_ms: number; client_duration_ms: number | null;
      fps: number | null; created_at: string;
    }> | null }

  if (!data) return NextResponse.json([])

  const userIds = Array.from(new Set(data.map(r => r.user_id)))
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)

  const nameById = new Map((profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]))

  return NextResponse.json(
    data.map(r => ({
      ...r,
      display_name: nameById.get(r.user_id) ?? r.user_id,
    }))
  )
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  await admin.from('flappy_suspicious_attempts').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
