"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import HeroPlusGrid from './HeroPlusGrid'

// Lazy-load the heavy game component
const FootballGame = dynamic(() => import('./FootballGame'), { ssr: false })

interface Props {
  playerName: string
  opponents: string[]
}

export default function EasterEggListener({ playerName, opponents }: Props) {
  const [gameOpen, setGameOpen] = useState(false)

  return (
    <>
      <HeroPlusGrid onTripleClick={() => setGameOpen(true)} />
      {gameOpen && (
        <FootballGame
          playerName={playerName}
          opponents={opponents}
          onClose={() => setGameOpen(false)}
        />
      )}
    </>
  )
}
