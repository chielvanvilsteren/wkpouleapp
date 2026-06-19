import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

  it('renders match stage labels in the single list', () => {
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

  it('shows all match rows without opening group accordions', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    const nlSpans = screen.getAllByText('Netherlands').filter(el => el.tagName === 'SPAN')
    expect(nlSpans.length).toBeGreaterThan(0)
    const deSpans = screen.getAllByText('Germany').filter(el => el.tagName === 'SPAN')
    expect(deSpans.length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Groep A/ })).not.toBeInTheDocument()
  })

  it('sorts matches chronologically by Dutch kickoff time', () => {
    const unsortedMatches: Match[] = [
      {
        id: 3,
        match_number: 3,
        stage: 'group',
        group_name: 'D',
        home_team: 'Turkey',
        away_team: 'Paraguay',
        match_date: '2026-06-20',
        match_time: '05:00:00',
        home_score: null,
        away_score: null,
        is_live: false,
        is_finished: false,
      },
      {
        id: 4,
        match_number: 4,
        stage: 'group',
        group_name: 'D',
        home_team: 'USA',
        away_team: 'Australia',
        match_date: '2026-06-19',
        match_time: '21:00:00',
        home_score: null,
        away_score: null,
        is_live: false,
        is_finished: false,
      },
    ]

    render(
      <WkPouleForm
        matches={unsortedMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now="2026-06-19T12:00:00Z"
      />
    )

    const rows = Array.from(document.querySelectorAll('[data-testid^="match-row-"]'))
    expect(rows.map((row) => row.getAttribute('data-testid'))).toEqual([
      'match-row-4',
      'match-row-3',
    ])
    expect(screen.getByText(/Vandaag/)).toBeInTheDocument()
    expect(screen.getByText(/Morgen/)).toBeInTheDocument()
  })

  it('exports the chronological match list as CSV', async () => {
    const createObjectURL = jest.fn(() => 'blob:wk-poule')
    const revokeObjectURL = jest.fn()
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const unsortedMatches: Match[] = [
      {
        id: 3,
        match_number: 21,
        stage: 'group',
        group_name: 'D',
        home_team: 'Turkey',
        away_team: 'Paraguay',
        match_date: '2026-06-20',
        match_time: '05:00:00',
        home_score: null,
        away_score: null,
        is_live: false,
        is_finished: false,
      },
      {
        id: 4,
        match_number: 22,
        stage: 'group',
        group_name: 'D',
        home_team: 'USA',
        away_team: 'Australia',
        match_date: '2026-06-19',
        match_time: '21:00:00',
        home_score: 2,
        away_score: 1,
        is_live: false,
        is_finished: true,
      },
    ]
    const initialPredictions: MatchPrediction[] = [
      { id: 'pred-4', user_id: 'user-1', match_id: 4, home_score: 2, away_score: 1 },
    ]

    try {
      render(
        <WkPouleForm
          matches={unsortedMatches}
          initialPredictions={initialPredictions}
          initialIncidents={emptyIncidents}
          isOpen
          now="2026-06-19T12:00:00Z"
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /CSV export/i }))

      expect(clickSpy).toHaveBeenCalled()
      expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:wk-poule')

      const blob = createObjectURL.mock.calls[0][0] as Blob
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsText(blob)
      })

      expect(text).toContain('Wedstrijdnummer;Datum;Tijd;Fase;Thuis;Uit;Voorspelling thuis;Voorspelling uit;Uitslag thuis;Uitslag uit;Punten;Status')
      expect(text).toContain('22;2026-06-19;21:00;Groep D;USA;Australia;2;1;2;1;3;Afgerond')
      expect(text.indexOf('22;2026-06-19')).toBeLessThan(text.indexOf('21;2026-06-20'))
    } finally {
      clickSpy.mockRestore()
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
      })
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
      })
    }
  })

  it('shows lock icon when group stage is closed (isOpen=false)', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen={false}
        now={nowPast}
      />
    )
    // Lock icons should appear for all group matches when deadline passed
    expect(screen.getAllByText('🔒').length).toBeGreaterThan(0)
  })

  it('score inputs are disabled when group stage deadline passed (isOpen=false)', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen={false}
        now={nowPast}
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
    expect(screen.getByText(/0 \/ 2 groepswedstrijden ingevuld/)).toBeInTheDocument()
  })

  it('counts saved 0-0 group predictions as filled', () => {
    const initialPredictions: MatchPrediction[] = [
      { id: 'pred-1', user_id: 'user-1', match_id: 1, home_score: 0, away_score: 0 },
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
    expect(screen.getByText(/1 \/ 2 groepswedstrijden ingevuld/)).toBeInTheDocument()
  })

  it('does not count saved knockout predictions in group progress', () => {
    const matches = [...groupMatches, ...finalMatch]
    const initialPredictions: MatchPrediction[] = [
      { id: 'pred-1', user_id: 'user-1', match_id: 10, home_score: 2, away_score: 1 },
    ]
    render(
      <WkPouleForm
        matches={matches}
        initialPredictions={initialPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText(/0 \/ 2 groepswedstrijden ingevuld/)).toBeInTheDocument()
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

  it('Opslaan calls upsert for matches and incidents', async () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText(/💾 Opslaan/))
    await waitFor(() => {
      // match_predictions upsert + wk_incidents_predictions upsert
      expect(mockUpsert).toHaveBeenCalledTimes(2)
    })
  })

  it('Opslaan shows "Opgeslagen" on success', async () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    fireEvent.click(screen.getByText(/💾 Opslaan/))
    await waitFor(() => {
      expect(screen.getByText(/Opgeslagen/)).toBeInTheDocument()
    })
  })

  it('counts default 0-0 group matches as filled after saving', async () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText(/0 \/ 2 groepswedstrijden ingevuld/)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/💾 Opslaan/))

    await waitFor(() => {
      expect(screen.getByText(/2 \/ 2 groepswedstrijden ingevuld/)).toBeInTheDocument()
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
    fireEvent.click(screen.getByText(/💾 Opslaan/))
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
    fireEvent.click(screen.getByText(/💾 Opslaan/))
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
    fireEvent.click(screen.getByText(/💾 Opslaan/))
    await waitFor(() => {
      expect(screen.getByText(/Incidents DB error/)).toBeInTheDocument()
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

  it('knockout match with match_time locks 15 min before kickoff', () => {
    // Knockout match kicking off at 2026-07-10 18:00 Amsterdam time
    // nowFuture = 2030-01-01 → past kickoff → locked
    const knockoutMatchWithTime: Match[] = [
      ...groupMatches, // needed so countriesSet is populated
      {
        id: 20,
        match_number: 73,
        stage: 'r32',
        group_name: null,
        home_team: 'Netherlands', // known team
        away_team: 'Germany',     // known team (add to groupMatches below if needed)
        match_date: '2026-07-10',
        match_time: '18:00:00',
        home_score: null,
        away_score: null,
        is_live: false,
        is_finished: false,
      },
    ]
    render(
      <WkPouleForm
        matches={knockoutMatchWithTime}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        adminOpen
        now={nowFuture}
      />
    )
    // Knockout match past kickoff should show lock icon
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

  it('shows actual score, 3 points, and green row for exact prediction', () => {
    const finishedMatches: Match[] = [
      { ...groupMatches[0], home_score: 2, away_score: 1, is_finished: true },
    ]
    const initialPredictions: MatchPrediction[] = [
      { id: 'pred-1', user_id: 'user-1', match_id: 1, home_score: 2, away_score: 1 },
    ]
    render(
      <WkPouleForm
        matches={finishedMatches}
        initialPredictions={initialPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText('2-1')).toBeInTheDocument()
    const row = screen.getByTestId('match-row-1')
    expect(within(row).getByText('3 pt')).toBeInTheDocument()
    expect(row).toHaveClass('bg-emerald-50')
  })

  it('shows 1 point and orange row for correct match result', () => {
    const finishedMatches: Match[] = [
      { ...groupMatches[0], home_score: 3, away_score: 2, is_finished: true },
    ]
    const initialPredictions: MatchPrediction[] = [
      { id: 'pred-1', user_id: 'user-1', match_id: 1, home_score: 1, away_score: 0 },
    ]
    render(
      <WkPouleForm
        matches={finishedMatches}
        initialPredictions={initialPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText('3-2')).toBeInTheDocument()
    const row = screen.getByTestId('match-row-1')
    expect(within(row).getByText('1 pt')).toBeInTheDocument()
    expect(row).toHaveClass('bg-orange-50')
  })

  it('shows 0 points and red row for wrong prediction', () => {
    const finishedMatches: Match[] = [
      { ...groupMatches[0], home_score: 2, away_score: 1, is_finished: true },
    ]
    const initialPredictions: MatchPrediction[] = [
      { id: 'pred-1', user_id: 'user-1', match_id: 1, home_score: 1, away_score: 2 },
    ]
    render(
      <WkPouleForm
        matches={finishedMatches}
        initialPredictions={initialPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText('2-1')).toBeInTheDocument()
    expect(screen.getByText('0 pt')).toBeInTheDocument()
    expect(screen.getByTestId('match-row-1')).toHaveClass('bg-red-50')
  })

  it('shows scoring overview without an accordion', () => {
    render(
      <WkPouleForm
        matches={groupMatches}
        initialPredictions={emptyPredictions}
        initialIncidents={emptyIncidents}
        isOpen
        now={nowPast}
      />
    )
    expect(screen.getByText('Exact score')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Puntenverdeling/ })).not.toBeInTheDocument()
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
