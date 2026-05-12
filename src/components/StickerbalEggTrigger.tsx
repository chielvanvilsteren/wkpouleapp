"use client"

import { useRef, useState, useCallback, useEffect } from 'react'
import StickerbalTransition from './StickerbalTransition'
import StickerbalBackground from './StickerbalBackground'
import StickerbalModal from './StickerbalModal'

const MUSIC_SRC = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Pump.mp3'
const CLICKS_NEEDED = 5

export default function StickerbalEggTrigger({ defaultName = '' }: { defaultName?: string }) {
  const [count, setCount] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mutedRef = useRef(false)
  mutedRef.current = muted

  const stopMusic = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
  }, [])

  useEffect(() => () => stopMusic(), [stopMusic])

  const handleClick = () => {
    if (transitioning || showModal) return

    const next = count + 1
    setCount(next)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCount(0), 1200)

    if (next >= CLICKS_NEEDED) {
      setCount(0)
      if (timerRef.current) clearTimeout(timerRef.current)
      const audio = new Audio(MUSIC_SRC)
      audio.loop = false
      audio.volume = 0.5
      audio.muted = mutedRef.current
      audio.play().catch(() => {})
      audioRef.current = audio
      sessionStorage.setItem('spel_unlocked', '1')
      setTransitioning(true)
    }
  }

  const dots = Math.min(count, CLICKS_NEEDED - 1)

  return (
    <>
      <div
        className="relative inline-block cursor-pointer select-none"
        onClick={handleClick}
      >
        <span className="text-2xl block transition-transform active:scale-75">⚽</span>
        {count > 0 && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5">
            {Array.from({ length: CLICKS_NEEDED - 1 }).map((_, i) => (
              <div key={i} className={`w-1 h-1 rounded-full transition-colors ${i < dots ? 'bg-oranje-400' : 'bg-gray-300'}`} />
            ))}
          </div>
        )}
      </div>

      {transitioning && (
        <>
          <StickerbalTransition
            onComplete={() => {
              stopMusic()
              setTransitioning(false)
              setShowModal(true)
            }}
          />
          <button
            onClick={() => setMuted(m => {
              const next = !m
              if (audioRef.current) audioRef.current.muted = next
              return next
            })}
            style={{
              position: 'fixed', bottom: 20, right: 20, zIndex: 10000,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </>
      )}

      {showModal && (
        <>
          <StickerbalBackground />
          <StickerbalModal
            defaultName={defaultName}
            onClose={() => setShowModal(false)}
          />
        </>
      )}
    </>
  )
}
