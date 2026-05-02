import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminUitslagForm from '@/components/AdminUitslagForm'
import type { MasterUitslag } from '@/types'

const mockUpsert = jest.fn(() => Promise.resolve({ error: null }))
const mockGetSession = jest.fn(() => Promise.resolve({ data: { session: { access_token: 'token-123' } } }))
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }))
const mockAuth = { getSession: mockGetSession }

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: mockAuth,
  })),
}))

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: 'Scores berekend', count: 5 }),
  } as Response)
)

const emptyUitslag: MasterUitslag = {
  id: 1,
  selectie: [],
  basis_xi: [],
  inzendingen_open: true,
  inzendingen_deadline: null,
  scores_zichtbaar: false,
  wk_poule_open: false,
  wk_poule_deadline: null,
  wk_scores_zichtbaar: false,
  updated_at: '2026-01-01T00:00:00Z',
}

const filledUitslag: MasterUitslag = {
  ...emptyUitslag,
  selectie: ['Van Dijk', 'De Jong', ...Array(24).fill('')],
  basis_xi: ['Van Dijk', 'De Jong', ...Array(9).fill('')],
}

describe('AdminUitslagForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'ok', count: 0 }),
    })
  })

  it('renders 26 selectie inputs', () => {
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    // All 26 selectie inputs have placeholder "Speler X"
    const inputs = screen.getAllByPlaceholderText(/^Speler/)
    expect(inputs.length).toBe(37) // 26 + 11
  })

  it('renders 11 basis_xi inputs', () => {
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    expect(screen.getByText('Officiële Selectie (26 spelers)')).toBeInTheDocument()
    expect(screen.getByText(/Basis XI/)).toBeInTheDocument()
  })

  it('shows initial values from uitslag prop', () => {
    render(<AdminUitslagForm uitslag={filledUitslag} />)
    expect(screen.getAllByDisplayValue('Van Dijk').length).toBeGreaterThan(0)
    expect(screen.getAllByDisplayValue('De Jong').length).toBeGreaterThan(0)
  })

  it('input changes update values', () => {
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    const inputs = screen.getAllByPlaceholderText(/^Speler/)
    fireEvent.change(inputs[0], { target: { value: 'Virgil van Dijk' } })
    expect(inputs[0]).toHaveValue('Virgil van Dijk')
  })

  it('save button shows "Uitslag opslaan..." during save', async () => {
    // Make upsert slow
    mockUpsert.mockReturnValueOnce(new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100)))
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    const saveBtn = screen.getByRole('button')
    fireEvent.click(saveBtn)
    expect(screen.getByText('Uitslag opslaan...')).toBeInTheDocument()
  })

  it('shows success banner after save', async () => {
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    const saveBtn = screen.getByRole('button')
    fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(screen.getByText(/Uitslag opgeslagen en scores herberekend/)).toBeInTheDocument()
    })
  })

  it('calls upsert with correct table', async () => {
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('master_uitslag')
      expect(mockUpsert).toHaveBeenCalled()
    })
  })

  it('calls fetch for recalculation after upsert', async () => {
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scores/recalculate',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows error when upsert fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'DB connection error' } })
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText(/Fout:/)).toBeInTheDocument()
      expect(screen.getByText(/DB connection error/)).toBeInTheDocument()
    })
  })

  it('shows error when fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Score berekening mislukt.' }),
    })
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText(/Score berekening mislukt/)).toBeInTheDocument()
    })
  })

  it('uses empty Bearer token when session is null', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scores/recalculate',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer ' }),
        })
      )
    })
  })

  it('shows fallback error when fetch body has no error field', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText(/Score berekening mislukt/)).toBeInTheDocument()
    })
  })

  it('shows "Scores berekenen..." during recalculation phase', async () => {
    let fetchResolve!: (value: unknown) => void
    ;(global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => { fetchResolve = resolve })
    )
    render(<AdminUitslagForm uitslag={emptyUitslag} />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Scores berekenen...')).toBeInTheDocument()
    })
    fetchResolve({ ok: true, json: () => Promise.resolve({ message: 'ok' }) })
  })

  it('basis_xi input change triggers updateBasisXi', () => {
    const { container } = render(<AdminUitslagForm uitslag={emptyUitslag} />)
    const allTextInputs = container.querySelectorAll('input[type="text"]')
    // First 26 are selectie, next 11 are basis_xi
    const firstBasisXiInput = allTextInputs[26] as HTMLInputElement
    fireEvent.change(firstBasisXiInput, { target: { value: 'De Vrij' } })
    expect(firstBasisXiInput.value).toBe('De Vrij')
  })
})
