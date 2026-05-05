import { render, screen } from '@testing-library/react'
import EasterEggListener from '@/components/EasterEggListener'

jest.mock('@/components/HeroPlusGrid', () => ({
  __esModule: true,
  default: ({ onTripleClick }: { onTripleClick: () => void }) => (
    <button data-testid="plus-grid" onClick={onTripleClick}>grid</button>
  ),
}))

jest.mock('next/dynamic', () => (fn: () => Promise<{ default: React.ComponentType<{ onClose: () => void }> }>) => {
  const Component = ({ onClose }: { onClose: () => void }) => (
    <div data-testid="football-game">
      <button onClick={onClose}>Sluiten</button>
    </div>
  )
  Component.displayName = 'FootballGame'
  return Component
})

import { fireEvent } from '@testing-library/react'

describe('EasterEggListener', () => {
  it('renders HeroPlusGrid', () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    expect(screen.getByTestId('plus-grid')).toBeInTheDocument()
  })

  it('does not show FootballGame initially', () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    expect(screen.queryByTestId('football-game')).not.toBeInTheDocument()
  })

  it('shows FootballGame after triple click', () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    fireEvent.click(screen.getByTestId('plus-grid'))
    expect(screen.getByTestId('football-game')).toBeInTheDocument()
  })

  it('hides FootballGame after close', () => {
    render(<EasterEggListener playerName="Chiel" opponents={['CPU']} />)
    fireEvent.click(screen.getByTestId('plus-grid'))
    fireEvent.click(screen.getByText('Sluiten'))
    expect(screen.queryByTestId('football-game')).not.toBeInTheDocument()
  })
})
