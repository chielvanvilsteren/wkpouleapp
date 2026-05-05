import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminRecalcWkScores from '@/components/AdminRecalcWkScores'

const mockGetSession = jest.fn(() =>
  Promise.resolve({ data: { session: { access_token: 'tok' } } })
)

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { getSession: mockGetSession },
  })),
}))

global.fetch = jest.fn()

describe('AdminRecalcWkScores', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Scores herberekend voor 4 deelnemers.' }),
    })
  })

  it('renders the recalc button', () => {
    render(<AdminRecalcWkScores />)
    expect(screen.getByRole('button', { name: /Herbereken WK Scores/i })).toBeInTheDocument()
  })

  it('shows "Berekenen..." while busy', async () => {
    let resolve!: (v: unknown) => void
    ;(global.fetch as jest.Mock).mockReturnValueOnce(new Promise((r) => { resolve = r }))
    render(<AdminRecalcWkScores />)
    fireEvent.click(screen.getByRole('button', { name: /Herbereken/i }))
    expect(screen.getByText('Berekenen...')).toBeInTheDocument()
    resolve({ ok: true, json: () => Promise.resolve({ message: 'ok' }) })
  })

  it('shows success message after successful recalc', async () => {
    render(<AdminRecalcWkScores />)
    fireEvent.click(screen.getByRole('button', { name: /Herbereken/i }))
    await waitFor(() => {
      expect(screen.getByText(/Scores herberekend voor 4 deelnemers/)).toBeInTheDocument()
    })
  })

  it('shows fallback success message when body.message is missing', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })
    render(<AdminRecalcWkScores />)
    fireEvent.click(screen.getByRole('button', { name: /Herbereken/i }))
    await waitFor(() => {
      expect(screen.getByText(/Scores herberekend\./)).toBeInTheDocument()
    })
  })

  it('shows error message on failure', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'DB fout' }),
    })
    render(<AdminRecalcWkScores />)
    fireEvent.click(screen.getByRole('button', { name: /Herbereken/i }))
    await waitFor(() => {
      expect(screen.getByText(/DB fout/)).toBeInTheDocument()
    })
  })

  it('shows fallback error when body has no error field', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })
    render(<AdminRecalcWkScores />)
    fireEvent.click(screen.getByRole('button', { name: /Herbereken/i }))
    await waitFor(() => {
      expect(screen.getByText(/Onbekende fout/)).toBeInTheDocument()
    })
  })

  it('uses empty Bearer token when session is null', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    render(<AdminRecalcWkScores />)
    fireEvent.click(screen.getByRole('button', { name: /Herbereken/i }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/wk-scores/recalculate',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer ' }),
        })
      )
    })
  })
})
