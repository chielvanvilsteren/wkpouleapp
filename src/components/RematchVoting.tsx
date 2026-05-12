'use client'

interface Player {
  sessionId: string
  displayName: string
  team: 'blue' | 'red'
}

interface Props {
  players: Player[]
  mySessionId: string
  votes: Record<string, 'yes' | 'no'>
  countdown: number | null
  onVote: (vote: 'yes' | 'no') => void
}

const TEAM_COLOR: Record<string, string> = { blue: '#4466ee', red: '#ee3333' }

export default function RematchVoting({ players, mySessionId, votes, countdown, onVote }: Props) {
  const myVote = votes[mySessionId]
  const humans = players.filter(p => !p.sessionId.startsWith('bot_'))
  const allVoted = players.every(p => votes[p.sessionId] !== undefined)
  const allYes = players.every(p => votes[p.sessionId] === 'yes')
  const anyNo = players.some(p => votes[p.sessionId] === 'no')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: 'rgba(6,13,48,0.92)',
        border: '2px solid rgba(80,140,255,0.4)',
        borderRadius: '20px',
        padding: '32px 36px',
        maxWidth: '420px',
        width: '100%',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 0 60px rgba(40,100,255,0.25)',
        fontFamily: 'Arial, sans-serif',
        color: '#fff',
        textAlign: 'center',
      }}>
        {/* Title */}
        <div style={{ fontSize: '13px', letterSpacing: '4px', color: '#88aaff', marginBottom: '6px' }}>
          STICKERBAL
        </div>
        <div style={{ fontSize: '26px', fontWeight: 900, marginBottom: '24px', fontFamily: 'Impact, Arial Black' }}>
          Nog een keer spelen?
        </div>

        {/* Player list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {players.map(p => {
            const vote = votes[p.sessionId]
            const isBot = p.sessionId.startsWith('bot_')
            return (
              <div key={p.sessionId} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: TEAM_COLOR[p.team],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 900, color: '#fff', flexShrink: 0,
                  }}>
                    {p.displayName[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>
                    {p.displayName}
                    {p.sessionId === mySessionId && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>(jij)</span>}
                    {isBot && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>🤖</span>}
                  </span>
                </div>
                <div style={{ fontSize: '20px' }}>
                  {vote === 'yes' ? '✅' : vote === 'no' ? '❌' : '⏳'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Countdown bar */}
        {countdown !== null && allYes && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#88aaff', marginBottom: '8px', letterSpacing: '2px' }}>
              START OVER {countdown} SECONDEN
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, #4466ee, #44ccff)',
                width: `${(countdown / 10) * 100}%`,
                transition: 'width 0.9s linear',
              }} />
            </div>
          </div>
        )}

        {/* Status */}
        {anyNo && (
          <div style={{ fontSize: '13px', color: '#ff6666', marginBottom: '16px' }}>
            Iemand wil niet verder spelen.
          </div>
        )}

        {/* Vote buttons */}
        {!myVote && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => onVote('yes')}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #2244cc, #4466ff)',
                border: '2px solid #5588ff',
                color: '#fff', fontSize: '16px', fontWeight: 900,
                cursor: 'pointer', transition: 'transform 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              ⚽ Ja!
            </button>
            <button
              onClick={() => onVote('no')}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.6)', fontSize: '16px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Nee
            </button>
          </div>
        )}

        {myVote === 'yes' && !allYes && (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
            Wachten op andere spelers…
          </div>
        )}
        {myVote === 'no' && (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
            Je verlaat het spel. Wacht tot iedereen klaar is.
          </div>
        )}
      </div>
    </div>
  )
}
