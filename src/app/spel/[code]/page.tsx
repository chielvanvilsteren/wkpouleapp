import GameRoom from './GameRoom'

export default function SpelRoomPage({ params }: { params: { code: string } }) {
  return <GameRoom code={params.code.toUpperCase()} />
}
