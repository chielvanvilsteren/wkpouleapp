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
  wereldkampioen: '',
  finale_team1: '',
  finale_team2: '',
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
    // Netherlands is in group-A (open) → visible as match row span
    const nlSpans = screen.getAllByText('Netherlands').filter(el => el.tagName === 'SPAN')
    expect(nlSpans.length).toBeGreaterThan(0)
    // Germany is in group-F (closed) → no match row span visible
    const deSpans = screen.queryAllByText('Germany').filter(el => el.tagName === 'SPAN')
    expect(deSpans).toHaveLength(0)
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
    // After close, Netherlands span should be gone from match rows
    const nlSpansClosed = screen.queryAllByText('Netherlands').filter(el => el.tagName === 'SPAN')
    expect(nlSpansClosed).toHaveLength(0)
    fireEvent.click(screen.getByText('Groep A'))
    // After reopen, Netherlands span is back
    const nlSpansOpen = screen.getAllByText('Netherlands').filter(el => el.tagName === 'SPAN')
    expect(nlSpansOpen.length).toBeGreaterThan(0)
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
    mockGetUser.mockResolvedValueOnce({ data: { user: null } } as any)
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
    mockUpsert.mockResolvedValueOnce({ error: { message: 'Match save failed' } } as any)
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
    // rode_kaart and geblesseerde use "Leeglaten = niemand" placeholder; gele_kaart and eerste_goal_nl use "Spelernaam"
    const leegInputs = screen.getAllByPlaceholderText('Leeglaten = niemand')
    const spelernaamInputs = screen.getAllByPlaceholderText('Spelernaam')
    fireEvent.change(leegInputs[0], { target: { value: 'Dumfries' } })
    fireEvent.change(spelernaamInputs[0], { target: { value: 'De Jong' } })
    fireEvent.change(spelernaamInputs[1], { target: { value: 'Depay' } })
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
      .mockResolvedValueOnce({ error: null } as any) // match predictions OK
      .mockResolvedValueOnce({ error: { message: 'Incidents DB error' } } as any) // incidents fail
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
      const calls = mockUpsert.mock.calls as any[]
      const incidentsCall = calls[1]?.[0]
      expect(incidentsCall?.is_definitief).toBe(true)
      // Locked banner should appear
      expect(screen.getByText(/definitief ingezonden/)).toBeInTheDocument()
    })
  })

  it('PlayerSelect renders as dropdown when selectie prop is provided', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
        selectie={['Dumfries', 'De Jong', 'Depay']}
      />
    )
    // When selectie is set, player fields become <select> dropdowns
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
    // The dropdown shows "— Kies een speler —" as placeholder option
    expect(screen.getAllByText(/Kies een speler/).length).toBeGreaterThan(0)
  })

  it('PlayerSelect dropdown onChange updates the field value', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
        selectie={['Dumfries', 'De Jong', 'Depay']}
      />
    )
    const selects = screen.getAllByRole('combobox')
    // Change the first select (rode_kaart player select)
    fireEvent.change(selects[0], { target: { value: 'Dumfries' } })
    expect((selects[0] as HTMLSelectElement).value).toBe('Dumfries')
  })

  it('CountrySelect renders as dropdown when group matches provide countries', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    // group matches have home/away teams, so countries = ['Brazil', 'Germany', 'Japan', 'Netherlands'] (sorted)
    // CountrySelect renders as <select> with "— Kies een land —"
    expect(screen.getAllByText(/Kies een land/).length).toBeGreaterThan(0)
  })

  it('CountrySelect dropdown onChange updates wereldkampioen', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    // Find country selects (wereldkampioen + finalist 1 + finalist 2)
    const countrySelects = screen.getAllByText(/Kies een land/)
    // Get the parent select elements
    const selects = screen.getAllByRole('combobox')
    // The last selects are country dropdowns (player selects come first when no selectie prop)
    // With no selectie prop, no player dropdowns exist — all comboboxes are country selects
    fireEvent.change(selects[0], { target: { value: 'Netherlands' } })
    expect((selects[0] as HTMLSelectElement).value).toBe('Netherlands')
  })

  it('match with match_time uses time for kickoff calculation', () => {
    const matchWithTime: Match[] = [
      {
        id: 20,
        match_number: 10,
        stage: 'group',
        group_name: 'A',
        home_team: 'France',
        away_team: 'Spain',
        match_date: '2026-06-20',
        match_time: '18:00:00',
        home_score: null,
        away_score: null,
        is_live: false,
        is_finished: false,
      },
    ]
    render(
      <WkPouleForm
        matches={matchWithTime}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowFuture}
      />
    )
    // With nowFuture, all matches including those with match_time should be locked
    expect(screen.getAllByText('🔒').length).toBeGreaterThan(0)
  })

  it('match_time is displayed as HH:MM in the match row', () => {
    const matchWithTime: Match[] = [
      {
        id: 21,
        match_number: 11,
        stage: 'group',
        group_name: 'A',
        home_team: 'Portugal',
        away_team: 'Belgium',
        match_date: '2026-06-21',
        match_time: '21:00:00',
        home_score: null,
        away_score: null,
        is_live: false,
        is_finished: false,
      },
    ]
    render(
      <WkPouleForm
        matches={matchWithTime}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    // match_time is displayed sliced to HH:MM
    expect(screen.getByText('21:00')).toBeInTheDocument()
  })

  it('initialPredictions pre-fills score map for matching match ids', () => {
    const initialPredictions: MatchPrediction[] = [
      { id: 'pred-1', user_id: 'user-1', match_id: 1, home_score: 2, away_score: 1 },
    ]
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={initialPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    // Score inputs for match 1 should have values 2 and 1
    const scoreInputs = screen.getAllByRole('spinbutton')
    expect(scoreInputs[0]).toHaveValue(2)
    expect(scoreInputs[1]).toHaveValue(1)
  })

  it('puntenOpen accordion toggles scoring overview', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    // Initially the scoring table is not visible
    expect(screen.queryByText('Exact score')).not.toBeInTheDocument()
    // Click the Puntenverdeling button to open it
    fireEvent.click(screen.getByText(/Puntenverdeling/))
    expect(screen.getByText('Exact score')).toBeInTheDocument()
    // Click again to close
    fireEvent.click(screen.getByText(/Puntenverdeling/))
    expect(screen.queryByText('Exact score')).not.toBeInTheDocument()
  })

  it('CountrySelect text input onChange fires when countries is empty (no group matches)', () => {
    // With only final-stage matches, there are no group teams so countries = []
    // CountrySelect renders as a plain <input> instead of <select>
    render(
      <WkPouleForm
        matches={finalMatch}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    // All country fields render as text inputs (placeholder "Land")
    const landInputs = screen.getAllByPlaceholderText('Land')
    expect(landInputs.length).toBeGreaterThan(0)
    // Trigger the onChange handler on the first country text input (wereldkampioen)
    fireEvent.change(landInputs[0], { target: { value: 'Netherlands' } })
    expect(screen.getByDisplayValue('Netherlands')).toBeInTheDocument()
  })
})
