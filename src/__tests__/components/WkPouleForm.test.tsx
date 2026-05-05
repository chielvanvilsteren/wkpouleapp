import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WkPouleForm from '@/components/WkPouleForm'
import type { Match, MatchPrediction, WkIncidentsPrediction } from '@/types'

const mockUpsert = jest.fn(() => Promise.resolve({ error: null }))
const mockGetUser = jest.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } }))
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const nowPast = '2020-01-01T00:00:00Z' // all matches open
const nowFuture = '2030-01-01T00:00:00Z' // all matches locked

const groupMatches: Match[] = [
  {
    id: 1,
    match_number: 1,
    stage: 'group',
    group_name: 'A',
    home_team: 'Netherlands',
    away_team: 'Japan',
    match_date: '2026-06-14T18:00:00Z',
    match_time: null,
    home_score: null,
    away_score: null,
    is_live: false,
    is_finished: false,
  },
  {
    id: 2,
    match_number: 2,
    stage: 'group',
    group_name: 'F',
    home_team: 'Germany',
    away_team: 'Brazil',
    match_date: '2026-06-15T18:00:00Z',
    match_time: null,
    home_score: null,
    away_score: null,
    is_live: false,
    is_finished: false,
  },
]

const finalMatch: Match[] = [
  {
    id: 10,
    match_number: 64,
    stage: 'final',
    group_name: null,
    home_team: 'Netherlands',
    away_team: 'Argentina',
    match_date: '2026-07-19T19:00:00Z',
    match_time: null,
    home_score: null,
    away_score: null,
    is_live: false,
    is_finished: false,
  },
]

const emptyPredictions: MatchPrediction[] = []
const emptyIncidents: WkIncidentsPrediction | null = null

const filledIncidents: WkIncidentsPrediction = {
  user_id: 'user-1',
  rode_kaart: 'Dumfries',
  gele_kaart: 'De Jong',
  geblesseerde: 'Van Dijk',
  eerste_goal_nl: 'Depay',
  topscorer_wk: 'Mbappe',
  is_definitief: false,
  updated_at: '2026-01-01T00:00:00Z',
}

describe('WkPouleForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('renders with empty matches', () => {
    render(
      <WkPouleForm
        matches={[]}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText(/wedstrijden ingevuld/)).toBeInTheDocument()
  })

  it('renders matches grouped by stage', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText('Groep A')).toBeInTheDocument()
    expect(screen.getByText('Groep F')).toBeInTheDocument()
  })

  it('renders final stage when present', () => {
    render(
      <WkPouleForm
        matches={finalMatch}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText('Finale')).toBeInTheDocument()
  })

  it('group-A is open by default, group-F is closed', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText('Netherlands')).toBeInTheDocument()
    expect(screen.queryByText('Germany')).not.toBeInTheDocument()
  })

  it('clicking group header toggles accordion', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText('Groep A'))
    expect(screen.queryByText('Netherlands')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Groep A'))
    expect(screen.getByText('Netherlands')).toBeInTheDocument()
  })

  it('shows lock icon when match is locked (nowFuture)', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowFuture}
      />
    )
    // Lock icons should appear for locked matches
    expect(screen.getAllByText('🔒').length).toBeGreaterThan(0)
  })

  it('score inputs are disabled when match is locked', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowFuture}
      />
    )
    const scoreInputs = screen.getAllByRole('spinbutton')
    scoreInputs.forEach((input) => {
      expect(input).toBeDisabled()
    })
  })

  it('score inputs are enabled when match is open', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    const scoreInputs = screen.getAllByRole('spinbutton')
    scoreInputs.forEach((input) => {
      expect(input).not.toBeDisabled()
    })
  })

  it('incidentsDefinitief=true shows locked banner', () => {
    const definitiefIncidents = { ...filledIncidents, is_definitief: true }
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={definitiefIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText(/definitief ingezonden/)).toBeInTheDocument()
  })

  it('isOpen=false shows closed banner', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen={false}
        now={nowPast}
      />
    )
    expect(screen.getByText(/WK Poule is gesloten/)).toBeInTheDocument()
  })

  it('progress bar shows filled match count', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText(/0 \/ 2 wedstrijden ingevuld/)).toBeInTheDocument()
  })

  it('shows incidents inputs', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText(/Eerste Rode Kaart NL/)).toBeInTheDocument()
    expect(screen.getByText(/Eerste Gele Kaart NL/)).toBeInTheDocument()
    // Topscorer may appear multiple times (label + subtitle span)
    expect(screen.getAllByText(/Topscorer WK/).length).toBeGreaterThan(0)
  })

  it('shows initial incidents values', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={filledIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByDisplayValue('Dumfries')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mbappe')).toBeInTheDocument()
  })

  it('Concept opslaan calls upsert for matches and incidents', async () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText(/Concept opslaan/))
    await waitFor(() => {
      // match_predictions upsert + wk_incidents_predictions upsert
      expect(mockUpsert).toHaveBeenCalledTimes(2)
    })
  })

  it('Concept opslaan shows "Concept opgeslagen" on success', async () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText(/Concept opslaan/))
    await waitFor(() => {
      expect(screen.getByText(/Concept opgeslagen/)).toBeInTheDocument()
    })
  })

  it('away score input onChange updates away score', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    const scoreInputs = screen.getAllByRole('spinbutton')
    // scoreInputs[1] is the away score of the first match
    fireEvent.change(scoreInputs[1], { target: { value: '2' } })
    expect(scoreInputs[1]).toHaveValue(2)
  })

  it('Definitief inzenden shows confirmation dialog', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText(/Definitief inzenden/))
    expect(screen.getByText(/Weet je het zeker/)).toBeInTheDocument()
  })

  it('Annuleren hides confirmation dialog', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText(/Definitief inzenden/))
    fireEvent.click(screen.getByText('Annuleren'))
    expect(screen.queryByText(/Weet je het zeker/)).not.toBeInTheDocument()
  })

  it('stops saving when user not logged in', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText(/Concept opslaan/))
    await waitFor(() => {
      // upsert should NOT have been called when user is null
      expect(mockUpsert).not.toHaveBeenCalled()
    })
  })

  it('shows error when match upsert fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'Match save failed' } })
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText(/Concept opslaan/))
    await waitFor(() => {
      expect(screen.getByText(/Match save failed/)).toBeInTheDocument()
    })
  })

  it('changing score input updates scores state (setScore callback)', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    const scoreInputs = screen.getAllByRole('spinbutton')
    fireEvent.change(scoreInputs[0], { target: { value: '3' } })
    expect(scoreInputs[0]).toHaveValue(3)
  })

  it('all incident onChange handlers update their fields', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    const inputs = screen.getAllByPlaceholderText('Spelernaam')
    fireEvent.change(inputs[0], { target: { value: 'Dumfries' } })
    fireEvent.change(inputs[1], { target: { value: 'De Jong' } })
    fireEvent.change(inputs[2], { target: { value: 'Van Dijk' } })
    fireEvent.change(inputs[3], { target: { value: 'Depay' } })
    const topscorerInput = screen.getByPlaceholderText('Spelersnaam + land')
    fireEvent.change(topscorerInput, { target: { value: 'Mbappe' } })
    expect(screen.getByDisplayValue('Dumfries')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mbappe')).toBeInTheDocument()
  })

  it('score input with non-numeric value falls back to 0 (|| 0 branch)', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    const scoreInputs = screen.getAllByRole('spinbutton')
    fireEvent.change(scoreInputs[0], { target: { value: 'abc' } })
    expect(scoreInputs[0]).toHaveValue(0)
  })

  it('shows error when incidents upsert fails', async () => {
    mockUpsert
      .mockResolvedValueOnce({ error: null }) // match predictions OK
      .mockResolvedValueOnce({ error: { message: 'Incidents DB error' } }) // incidents fail
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText(/Concept opslaan/))
    await waitFor(() => {
      expect(screen.getByText(/Incidents DB error/)).toBeInTheDocument()
    })
  })

  it('Ja inzenden triggers definitief save (sets incidentsDefinitief)', async () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText(/Definitief inzenden/))
    fireEvent.click(screen.getByText('Ja, inzenden'))
    await waitFor(() => {
      // Both upserts called with definitief=true
      const incidentsCall = mockUpsert.mock.calls[1]?.[0]
      expect(incidentsCall?.is_definitief).toBe(true)
      // Locked banner should appear
      expect(screen.getByText(/definitief ingezonden/)).toBeInTheDocument()
    })
  })
})
