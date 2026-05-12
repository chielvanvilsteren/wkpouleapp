"use client"

import { useRef, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import StickerbalTransition from './StickerbalTransition'

const MUSIC_SRC = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Pump.mp3'

export default function StickerbalNavLink({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const [transitioning, setTransitioning] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const active = pathname === '/spel' || pathname.startsWith('/spel/')

  // Stop music on unmount
  useEffect(() => () => {
    audioRef.current?.pause()
    audioRef.current = null
  }, [])

  // Hide transition + stop music when /spel has loaded
  useEffect(() => {
    if (transitioning && (pathname === '/spel' || pathname.startsWith('/spel/'))) {
      audioRef.current?.pause()
      audioRef.current = null
      setTransitioning(false)
    }
  }, [pathname, transitioning])

  function handleClick() {
    onNavigate?.()
    if (active) return

    const audio = new Audio(MUSIC_SRC)
    audio.loop = false
    audio.volume = 0.5
    audio.play().catch(() => {})
    audioRef.current = audio
    setTransitioning(true)
  }

  const desktopCls = `relative px-3 py-2 text-sm font-medium transition-colors rounded-lg ${
    active ? 'text-white' : 'text-white/65 hover:text-white hover:bg-white/8'
  }`

  const mobileCls = `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`

  return (
    <>
      <button onClick={handleClick} className={mobile ? mobileCls : desktopCls}>
        Stickerbal
        {active && !mobile && (
          <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-oranje-400 rounded-full" />
        )}
      </button>

      {transitioning && (
        <StickerbalTransition
          onComplete={() => router.push('/spel')}
        />
      )}
    </>
  )
}
