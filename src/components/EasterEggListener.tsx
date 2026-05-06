"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import HeroPlusGrid from './HeroPlusGrid'
import GameTransition from './GameTransition'

const FootballGame = dynamic(() => import('./FootballGame'), { ssr: false })

interface Props {
  playerName: string
  opponents: string[]
}

type State = 'idle' | 'transitioning' | 'open'

const MUSIC_SRC =
  'https://cdn.pixabay.com/download/audio/2023/02/18/audio_2a5bda7587.mp3?filename=luis_humanoide-space-adventures-orchestral-music-star-wars-style-139660.mp3'

export default function EasterEggListener({ playerName, opponents }: Props) {
  const [state, setState] = useState<State>('idle')
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const startMusic = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(MUSIC_SRC)
      audioRef.current.loop = true
      audioRef.current.volume = 0.5
    }
    audioRef.current.muted = muted
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(() => {/* autoplay blocked */})
  }, [muted])

  const stopMusic = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.currentTime = 0
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      if (audioRef.current) audioRef.current.muted = next
      return next
    })
  }, [])

  useEffect(() => {
    if (state === 'transitioning') startMusic()
    if (state === 'idle') stopMusic()
  }, [state, startMusic, stopMusic])

  // Cleanup on unmount
  useEffect(() => () => stopMusic(), [stopMusic])

  return (
    <>
      <HeroPlusGrid onTripleClick={() => setState('transitioning')} />
      {state !== 'idle' && (
        <>
          <GameTransition
            showText={state === 'transitioning'}
            onComplete={() => setState('open')}
          />
          <button
            onClick={toggleMute}
            title={muted ? 'Geluid aan' : 'Geluid uit'}
            style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              zIndex: 200,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </>
      )}
      {state === 'open' && (
        <FootballGame
          playerName={playerName}
          opponents={opponents}
          onClose={() => setState('idle')}
          onGameStart={stopMusic}
        />
      )}
    </>
  )
}
