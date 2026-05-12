import { createClient } from '@/lib/supabase/server'
import GameRoom from './GameRoom'

export default async function SpelRoomPage({ params }: { params: { code: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let displayName: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    displayName = profile?.display_name ?? undefined
  }

  return <GameRoom code={params.code.toUpperCase()} displayName={displayName} />
}
