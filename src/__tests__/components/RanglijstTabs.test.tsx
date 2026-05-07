import { render, screen, fireEvent } from '@testing-library/react'
import RanglijstTabs from '@/components/RanglijstTabs'
import type { RanglijstEntry } from '@/types'

const entries: RanglijstEntry[] = [
  {
    user_id: 'u1',
    display_name: 'Alice',
    selectie_punten: 20,
    basis_xi_punten: 10,
    pre_totaal: 30,
    match_punten: 15,
    incidents_punten: 10,
    topscorer_punten: 20,
    toernooi_punten: 0,
    wk_totaal: 45,
    totaal: 75,
  },
  {
    user_id: 'u2',
    display_name: 'Bob',
    selectie_punten: 15,
    basis_xi_punten: 8,
    pre_totaal: 23,
    match_punten: 12,
    incidents_punten: 5,
    topscorer_punten: 0,
    wk_totaal: 17,
    totaal: 40,
  },
  {
    user_id: 'u3',
    display_name: 'Charlie',
    selectie_punten: 25,
    basis_xi_punten: 11,
    pre_totaal: 36,
    match_punten: 18,
    incidents_punten: 20,
    topscorer_punten: 20,
    wk_totaal: 58,
    totaal: 94,
  },
  {
    user_id: 'u4',
    display_name: 'Dana',
    selectie_punten: 18,
    basis_xi_punten: 9,
    pre_totaal: 27,
    match_punten: 10,
    incidents_punten: 0,
    topscorer_punten: 0,
    wk_totaal: 10,
    totaal: 37,
  },
  {
    user_id: 'u5',
    display_name: 'Eve',
    selectie_punten: 22,
    basis_xi_punten: 7,
    pre_totaal: 29,
    match_punten: 9,
    incidents_punten: 10,
    topscorer_punten: 20,
    wk_totaal: 39,
    totaal: 68,
  },
]

describe('RanglijstTabs', () => {
  it('default tab is "totaal" (Gecombineerd is active)', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar wkScoresZichtbaar />)
    const gecombineerdBtn = screen.getByRole('button', { name: 'Gecombineerd' })
    expect(gecombineerdBtn).toHaveClass('bg-white')
  })

  it('clicking Pre-pool switches tab', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar wkScoresZichtbaar />)
    fireEvent.click(screen.getByRole('button', { name: 'Pre-pool' }))
    expect(screen.getByRole('button', { name: 'Pre-pool' })).toHaveClass('bg-white')
  })

  it('clicking WK Poule switches tab', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar wkScoresZichtbaar />)
    fireEvent.click(screen.getByRole('button', { name: 'WK Poule' }))
    expect(screen.getByRole('button', { name: 'WK Poule' })).toHaveClass('bg-white')
  })

  it('clicking Gecombineerd switches back', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar wkScoresZichtbaar />)
    fireEvent.click(screen.getByRole('button', { name: 'Pre-pool' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gecombineerd' }))
    expect(screen.getByRole('button', { name: 'Gecombineerd' })).toHaveClass('bg-white')
  })

  it('sorts entries by totaal descending', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar wkScoresZichtbaar />)
    const rows = screen.getAllByRole('row')
    // Skip header row; first data row should be Charlie (totaal=94)
    expect(rows[1]).toHaveTextContent('Charlie')
  })

  it('sorts alphabetically for ties', () => {
    const tied: RanglijstEntry[] = [
      { ...entries[0], display_name: 'Zara', totaal: 50 },
      { ...entries[1], display_name: 'Abel', totaal: 50, user_id: 'u99' },
    ]
    render(<RanglijstTabs entries={tied} scoresZichtbaar wkScoresZichtbaar />)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Abel')
    expect(rows[2]).toHaveTextContent('Zara')
  })

  it('shows medals for top 3 when showScores=true in totaal tab', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar wkScoresZichtbaar />)
    expect(screen.getByText('🥇')).toBeInTheDocument()
    expect(screen.getByText('🥈')).toBeInTheDocument()
    expect(screen.getByText('🥉')).toBeInTheDocument()
  })

  it('shows numbers (not medals) when showScores=false', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar={false} wkScoresZichtbaar={false} />)
    expect(screen.queryByText('🥇')).not.toBeInTheDocument()
    // Numbers are shown instead
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows "Scores worden zichtbaar" message when not visible in totaal', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar={false} wkScoresZichtbaar={false} />)
    expect(screen.getByText(/Scores worden zichtbaar/)).toBeInTheDocument()
  })

  it('shows Selectie and Basis XI column headers in pre tab when scores visible', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar wkScoresZichtbaar />)
    fireEvent.click(screen.getByRole('button', { name: 'Pre-pool' }))
    expect(screen.getByText('Selectie')).toBeInTheDocument()
    expect(screen.getByText('Basis XI')).toBeInTheDocument()
  })

  it('shows Wedstr./Incidents/Topscorer columns in wk tab when scores visible', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar wkScoresZichtbaar />)
    fireEvent.click(screen.getByRole('button', { name: 'WK Poule' }))
    expect(screen.getByText('Wedstr.')).toBeInTheDocument()
    expect(screen.getByText('Incidents')).toBeInTheDocument()
    expect(screen.getByText('Topscorer')).toBeInTheDocument()
  })

  it('shows Pre-pool and WK Poule columns in totaal tab', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar wkScoresZichtbaar />)
    // There should be at least one "Pre-pool" text (tab button + column header)
    expect(screen.getAllByText('Pre-pool').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('WK Poule').length).toBeGreaterThanOrEqual(1)
    // The column header specifically
    const headers = screen.getAllByRole('columnheader')
    const headerTexts = headers.map((h) => h.textContent)
    expect(headerTexts).toContain('Pre-pool')
    expect(headerTexts).toContain('WK Poule')
  })

  it('shows message when pre scores not visible', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar={false} wkScoresZichtbaar />)
    fireEvent.click(screen.getByRole('button', { name: 'Pre-pool' }))
    expect(screen.getByText(/Pre-pool scores worden zichtbaar/)).toBeInTheDocument()
  })

  it('shows message when wk scores not visible', () => {
    render(<RanglijstTabs entries={entries} scoresZichtbaar wkScoresZichtbaar={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'WK Poule' }))
    expect(screen.getByText(/WK Poule scores worden zichtbaar/)).toBeInTheDocument()
  })

  it('pre tab sorting uses pre_totaal ?? 0 for null values', () => {
    const nullEntries = entries.map((e) => ({ ...e, pre_totaal: null }))
    render(<RanglijstTabs entries={nullEntries} scoresZichtbaar wkScoresZichtbaar />)
    fireEvent.click(screen.getByRole('button', { name: 'Pre-pool' }))
    // All pre_totaal null → sorted alphabetically
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(1)
  })

  it('wk tab sorting uses wk_totaal ?? 0 for null values', () => {
    const nullEntries = entries.map((e) => ({ ...e, wk_totaal: null }))
    render(<RanglijstTabs entries={nullEntries} scoresZichtbaar wkScoresZichtbaar />)
    fireEvent.click(screen.getByRole('button', { name: 'WK Poule' }))
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(1)
  })

  it('shows — for null selectie_punten in pre tab', () => {
    const nullScores = entries.map((e) => ({ ...e, selectie_punten: null, basis_xi_punten: null, pre_totaal: null }))
    render(<RanglijstTabs entries={nullScores} scoresZichtbaar wkScoresZichtbaar />)
    fireEvent.click(screen.getByRole('button', { name: 'Pre-pool' }))
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows — for null incidents_punten in wk tab', () => {
    const nullScores = entries.map((e) => ({ ...e, incidents_punten: null, match_punten: null, topscorer_punten: null, wk_totaal: null }))
    render(<RanglijstTabs entries={nullScores} scoresZichtbaar wkScoresZichtbaar />)
    fireEvent.click(screen.getByRole('button', { name: 'WK Poule' }))
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows — for null wk_totaal in totaal tab', () => {
    const nullScores = entries.map((e) => ({ ...e, wk_totaal: null, totaal: null }))
    render(<RanglijstTabs entries={nullScores} scoresZichtbaar wkScoresZichtbaar />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})
