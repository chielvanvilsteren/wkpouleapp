import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminMatchResults from '@/components/AdminMatchResults'
import type { Match } from '@/types'

const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockGetSession = jest.fn(() => Promise.resolve({ data: { session: { access_token: 'token' } } }))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: mockUpdate,
    })),
    auth: { getSession: mockGetSession },
  })),
}))

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: 'ok' }),
  } as Response)
)

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
    group_name: 'A',
    home_team: 'Germany',
    away_team: 'Brazil',
    match_date: '2026-06-14T21:00:00Z',
    match_time: null,
    home_score: 2,
    away_score: 1,
    is_live: false,
    is_finished: true,
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

describe('AdminMatchResults', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'ok' }),
    })
  })

  it('renders stage accordions for stages that have matches', () => {
    render(<AdminMatchResults matches={groupMatches} />)
    expect(screen.getByText('Groepsfase')).toBeInTheDocument()
  })

  it('does not render stages with no matches', () => {
    render(<AdminMatchResults matches={groupMatches} />)
    expect(screen.queryByText('Finale')).not.toBeInTheDocument()
  })

  it('renders multiple stages when multiple provided', () => {
    render(<AdminMatchResults matches={[...groupMatches, ...finalMatch]} />)
    expect(screen.getByText('Groepsfase')).toBeInTheDocument()
    expect(screen.getByText('Finale')).toBeInTheDocument()
  })

  it('group stage is open by default', () => {
    render(<AdminMatchResults matches={groupMatches} />)
    // Match teams should be visible when open
    expect(screen.getByText('Netherlands')).toBeInTheDocument()
    expect(screen.getByText('Japan')).toBeInTheDocument()
  })

  it('other stages are closed by default', () => {
    render(<AdminMatchResults matches={[...groupMatches, ...finalMatch]} />)
    // Final matches should NOT be visible (closed by default)
    expect(screen.queryByText('Argentina')).not.toBeInTheDocument()
  })

  it('clicking stage header toggles accordion', () => {
    render(<AdminMatchResults matches={groupMatches} />)
    // Click to close group stage
    fireEvent.click(screen.getByText('Groepsfase'))
    expect(screen.queryByText('Netherlands')).not.toBeInTheDocument()
    // Click to open again
    fireEvent.click(screen.getByText('Groepsfase'))
    expect(screen.getByText('Netherlands')).toBeInTheDocument()
  })

  it('shows "Afgerond" for finished match and "Nog te spelen" for unfinished', () => {
    render(<AdminMatchResults matches={groupMatches} />)
    expect(screen.getByText('Afgerond')).toBeInTheDocument()
    expect(screen.getByText('Nog te spelen')).toBeInTheDocument()
  })

  it('toggle cycles Nog te spelen → Bezig → Afgerond', () => {
    render(<AdminMatchResults matches={groupMatches} />)
    const nogTeSpelen = screen.getByText('Nog te spelen')
    fireEvent.click(nogTeSpelen)
    expect(screen.getByText('Bezig')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Bezig'))
    expect(screen.getAllByText('Afgerond').length).toBe(2)
  })

  it('save button triggers supabase update', async () => {
    render(<AdminMatchResults matches={groupMatches} />)
    const saveBtn = screen.getByRole('button', { name: /Uitslagen Opslaan/ })
    fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  it('shows saving status during save', async () => {
    mockEq.mockReturnValueOnce(
      new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    )
    render(<AdminMatchResults matches={groupMatches} />)
    const saveBtn = screen.getByRole('button', { name: /Uitslagen Opslaan/ })
    fireEvent.click(saveBtn)
    expect(screen.getByText('Uitslagen opslaan...')).toBeInTheDocument()
  })

  it('shows success status after successful save', async () => {
    render(<AdminMatchResults matches={groupMatches} />)
    fireEvent.click(screen.getByRole('button', { name: /Uitslagen Opslaan/ }))
    await waitFor(() => {
      expect(screen.getByText(/Uitslagen opgeslagen en scores herberekend/)).toBeInTheDocument()
    })
  })

  it('shows fallback when fetch json() throws during error path', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.reject(new Error('parse error')),
    })
    render(<AdminMatchResults matches={groupMatches} />)
    fireEvent.click(screen.getByRole('button', { name: /Uitslagen Opslaan/ }))
    await waitFor(() => {
      expect(screen.getByText(/Score berekening mislukt/)).toBeInTheDocument()
    })
  })

  it('shows error status when supabase update fails', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'Update failed' } })
    render(<AdminMatchResults matches={groupMatches} />)
    fireEvent.click(screen.getByRole('button', { name: /Uitslagen Opslaan/ }))
    await waitFor(() => {
      expect(screen.getByText(/Update failed/)).toBeInTheDocument()
    })
  })

  it('calls fetch for recalculation after save', async () => {
    render(<AdminMatchResults matches={groupMatches} />)
    fireEvent.click(screen.getByRole('button', { name: /Uitslagen Opslaan/ }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/wk-scores/recalculate',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('score inputs can be changed', () => {
    render(<AdminMatchResults matches={groupMatches} />)
    const scoreInputs = screen.getAllByPlaceholderText('—')
    fireEvent.change(scoreInputs[0], { target: { value: '3' } })
    expect(scoreInputs[0]).toHaveValue(3)
  })

  it('setting score input to empty string stores null', () => {
    render(<AdminMatchResults matches={groupMatches} />)
    const scoreInputs = screen.getAllByPlaceholderText('—')
    // First set a value, then clear it
    fireEvent.change(scoreInputs[0], { target: { value: '2' } })
    fireEvent.change(scoreInputs[0], { target: { value: '' } })
    expect(scoreInputs[0]).toHaveValue(null)
  })

  it('away score input onChange updates away score', () => {
    render(<AdminMatchResults matches={groupMatches} />)
    const scoreInputs = screen.getAllByPlaceholderText('—')
    // scoreInputs[1] is away score of first match
    fireEvent.change(scoreInputs[1], { target: { value: '1' } })
    expect(scoreInputs[1]).toHaveValue(1)
  })

  it('shows error message from fetch body when recalculation fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Recalc API error' }),
    })
    render(<AdminMatchResults matches={groupMatches} />)
    fireEvent.click(screen.getByRole('button', { name: /Uitslagen Opslaan/ }))
    await waitFor(() => {
      expect(screen.getByText(/Recalc API error/)).toBeInTheDocument()
    })
  })

  it('uses empty string Bearer token when session is null', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    render(<AdminMatchResults matches={groupMatches} />)
    fireEvent.click(screen.getByRole('button', { name: /Uitslagen Opslaan/ }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/wk-scores/recalculate',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer ' }),
        })
      )
    })
  })

  it('shows "WK Scores berekenen..." during recalculation phase', async () => {
    let fetchResolve!: (value: unknown) => void
    ;(global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => { fetchResolve = resolve })
    )
    render(<AdminMatchResults matches={groupMatches} />)
    fireEvent.click(screen.getByRole('button', { name: /Uitslagen Opslaan/ }))
    await waitFor(() => {
      expect(screen.getByText('WK Scores berekenen...')).toBeInTheDocument()
    })
    fetchResolve({ ok: true, json: () => Promise.resolve({ message: 'ok' }) })
  })

  it('shows fallback error message when fetch body has no error field', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })
    render(<AdminMatchResults matches={groupMatches} />)
    fireEvent.click(screen.getByRole('button', { name: /Uitslagen Opslaan/ }))
    await waitFor(() => {
      expect(screen.getByText(/Score berekening mislukt/)).toBeInTheDocument()
    })
  })
})
