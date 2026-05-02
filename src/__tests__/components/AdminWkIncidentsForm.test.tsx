import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminWkIncidentsForm from '@/components/AdminWkIncidentsForm'
import type { WkIncidentsUitslag } from '@/types'

const mockUpsert = jest.fn(() => Promise.resolve({ error: null }))
const mockGetSession = jest.fn(() => Promise.resolve({ data: { session: { access_token: 'token' } } }))
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: { getSession: mockGetSession },
  })),
}))

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: 'ok' }),
  } as Response)
)

const uitslag: WkIncidentsUitslag = {
  id: 1,
  rode_kaart: 'Dumfries',
  gele_kaart: 'De Jong',
  geblesseerde: 'Van Dijk',
  eerste_goal_nl: 'Depay',
  topscorer_wk: 'Mbappe',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('AdminWkIncidentsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'ok' }),
    })
  })

  it('renders all 5 incident input fields', () => {
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    expect(screen.getByText(/Eerste Rode Kaart NL/)).toBeInTheDocument()
    expect(screen.getByText(/Eerste Gele Kaart NL/)).toBeInTheDocument()
    expect(screen.getByText(/Eerste Geblesseerde NL/)).toBeInTheDocument()
    expect(screen.getByText(/Eerste Doelpunt NL/)).toBeInTheDocument()
    expect(screen.getByText(/Topscorer WK/)).toBeInTheDocument()
  })

  it('shows initial values from uitslag prop', () => {
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    expect(screen.getByDisplayValue('Dumfries')).toBeInTheDocument()
    expect(screen.getByDisplayValue('De Jong')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Depay')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mbappe')).toBeInTheDocument()
  })

  it('input changes update values', () => {
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    const input = screen.getByDisplayValue('Dumfries')
    fireEvent.change(input, { target: { value: 'Blind' } })
    expect(input).toHaveValue('Blind')
  })

  it('all onChange handlers update their respective fields', () => {
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    fireEvent.change(screen.getByDisplayValue('De Jong'), { target: { value: 'Koopmeiners' } })
    fireEvent.change(screen.getByDisplayValue('Van Dijk'), { target: { value: 'Timber' } })
    fireEvent.change(screen.getByDisplayValue('Depay'), { target: { value: 'Gakpo' } })
    fireEvent.change(screen.getByDisplayValue('Mbappe'), { target: { value: 'Haaland' } })
    expect(screen.getByDisplayValue('Koopmeiners')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Haaland')).toBeInTheDocument()
  })

  it('shows saving status during save', async () => {
    mockUpsert.mockReturnValueOnce(
      new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    )
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Opslaan...')).toBeInTheDocument()
  })

  it('shows success status after save', async () => {
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText(/Opgeslagen en scores herberekend/)).toBeInTheDocument()
    })
  })

  it('calls fetch for recalculation after upsert', async () => {
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/wk-scores/recalculate',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows error when upsert fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'Upsert failed' } })
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText(/Fout:/)).toBeInTheDocument()
      expect(screen.getByText(/Upsert failed/)).toBeInTheDocument()
    })
  })

  it('shows error when fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Score berekening mislukt.' }),
    })
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText(/Score berekening mislukt/)).toBeInTheDocument()
    })
  })

  it('uses ?? "" fallback when uitslag fields are null', () => {
    const nullUitslag = {
      ...uitslag,
      rode_kaart: null as unknown as string,
      gele_kaart: null as unknown as string,
      geblesseerde: null as unknown as string,
      eerste_goal_nl: null as unknown as string,
      topscorer_wk: null as unknown as string,
    }
    render(<AdminWkIncidentsForm uitslag={nullUitslag} />)
    const inputs = screen.getAllByPlaceholderText('Spelernaam')
    inputs.forEach((input) => expect(input).toHaveValue(''))
  })

  it('uses fallback error message when fetch body has no error field', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText(/Score berekening mislukt/)).toBeInTheDocument()
    })
  })

  it('uses empty string when session access_token is null', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    fireEvent.click(screen.getByRole('button'))
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
    render(<AdminWkIncidentsForm uitslag={uitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('WK Scores berekenen...')).toBeInTheDocument()
    })
    fetchResolve({ ok: true, json: () => Promise.resolve({ message: 'ok' }) })
  })
})
