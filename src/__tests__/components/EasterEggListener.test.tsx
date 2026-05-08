import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'

// ── Audio API mock ──────────────────────────────────────────────────────────
const mockPlay = jest.fn().mockResolvedValue(undefined)
const mockPause = jest.fn()
const mockAudio = {
  play: mockPlay,
  pause: mockPause,
  loop: false,
  volume: 1,
  muted: false,
  currentTime: 0,
}
global.Audio = jest.fn().mockImplementation(() => mockAudio) as unknown as typeof Audio

// ── GameTransition mock — calls onComplete immediately via useEffect ─────────
jest.mock('@/components/GameTransition', () => ({
  __esModule: true,
  default: ({ onComplete }: { onComplete?: () => void }) => {
    const React = require('react')
    React.useEffect(() => { onComplete?.() }, [])
    return <div data-testid="game-transition" />
  },
}))

// ── FootballGame dynamic mock ────────────────────────────────────────────────
jest.mock('next/dynamic', () => (
  _fn: () => Promise<{ default: React.ComponentType<{ onClose: () => void; onGameStart?: () => void }> }>
) => {
  const Component = ({
    onClose,
    onGameStart,
  }: {
    onClose: () => void
    onGameStart?: () => void
  }) => (
    <div data-testid="football-game">
      <button onClick={onClose}>Sluiten</button>
      <button onClick={onGameStart}>Start</button>
    </div>
  )
  Component.displayName = 'FootballGame'
  return Component
})

jest.mock('@/components/HeroPlusGrid', () => ({
  __esModule: true,
  default: ({ onTripleClick }: { onTripleClick: () => void }) => (
    <button data-testid="plus-grid" onClick={onTripleClick}>grid</button>
  ),
}))

import EasterEggListener from '@/components/EasterEggListener'

describe('EasterEggListener', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mockAudio state
    mockAudio.muted = false
    mockAudio.currentTime = 0
  })

  it('renders HeroPlusGrid', () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    expect(screen.getByTestId('plus-grid')).toBeInTheDocument()
  })

  it('does not show FootballGame initially', () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    expect(screen.queryByTestId('football-game')).not.toBeInTheDocument()
  })

  it('shows GameTransition and mute button after triple click', async () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    fireEvent.click(screen.getByTestId('plus-grid'))
    await waitFor(() => {
      expect(screen.getByTestId('game-transition')).toBeInTheDocument()
    })
    // mute button appears when state !== 'idle'
    expect(screen.getByTitle('Geluid uit')).toBeInTheDocument()
  })

  it('shows FootballGame after triple click (GameTransition calls onComplete)', async () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    fireEvent.click(screen.getByTestId('plus-grid'))
    await waitFor(() => {
      expect(screen.getByTestId('football-game')).toBeInTheDocument()
    })
  })

  it('hides FootballGame after close', async () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    fireEvent.click(screen.getByTestId('plus-grid'))
    await waitFor(() => expect(screen.getByTestId('football-game')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Sluiten'))
    await waitFor(() => {
      expect(screen.queryByTestId('football-game')).not.toBeInTheDocument()
    })
  })

  it('toggleMute button toggles muted state', async () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    fireEvent.click(screen.getByTestId('plus-grid'))
    await waitFor(() => expect(screen.getByTitle('Geluid uit')).toBeInTheDocument())

    const muteBtn = screen.getByTitle('Geluid uit')
    fireEvent.click(muteBtn)
    await waitFor(() => expect(screen.getByTitle('Geluid aan')).toBeInTheDocument())

    fireEvent.click(screen.getByTitle('Geluid aan'))
    await waitFor(() => expect(screen.getByTitle('Geluid uit')).toBeInTheDocument())
  })

  it('calls stopMusic on unmount', async () => {
    const { unmount } = render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    fireEvent.click(screen.getByTestId('plus-grid'))
    await waitFor(() => expect(screen.getByTestId('football-game')).toBeInTheDocument())
    unmount()
    expect(mockPause).toHaveBeenCalled()
  })

  it('passes onGameStart prop to FootballGame which calls stopMusic', async () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    fireEvent.click(screen.getByTestId('plus-grid'))
    await waitFor(() => expect(screen.getByTestId('football-game')).toBeInTheDocument())

    const startBtn = screen.getByText('Start')
    fireEvent.click(startBtn)
    // stopMusic pauses the audio
    expect(mockPause).toHaveBeenCalled()
  })

  it('startMusic plays audio', async () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    fireEvent.click(screen.getByTestId('plus-grid'))
    await waitFor(() => expect(mockPlay).toHaveBeenCalled())
  })
})
