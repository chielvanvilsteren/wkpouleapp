import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import SyncResultsButton from '@/components/SyncResultsButton'

const mockGetSession = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}))

function mockFetch(response: object, ok = true, reject = false) {
  global.fetch = jest.fn(() => {
    if (reject) return Promise.reject(new Error('Network error'))
    return Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
    } as Response)
  })
}

describe('SyncResultsButton', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'admin-access-token' } },
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    mockGetSession.mockReset()
  })

  it('renders idle button', () => {
    mockFetch({})
    render(<SyncResultsButton />)
    expect(screen.getByText(/Uitslagen ophalen/)).toBeInTheDocument()
    const btn = screen.getByRole('button')
    expect(btn).not.toBeDisabled()
  })

  it('shows loading modal when button is clicked', async () => {
    // Fetch that never resolves during this check
    global.fetch = jest.fn(() => new Promise(() => {}))
    render(<SyncResultsButton />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Football-Data.org wordt geraadpleegd.')).toBeInTheDocument()
    })
    // Button is disabled during loading
    expect(screen.getByRole('button', { name: /Uitslagen ophalen/ })).toBeDisabled()
  })

  it('shows success modal when updated > 0', async () => {
    mockFetch({ updated: 3, skipped: 1, unmatched: 0, log: [] })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText(/3 uitslagen bijgewerkt/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Scores worden automatisch herberekend/)).toBeInTheDocument()
  })

  it('sends the Supabase access token to the sync route', async () => {
    mockFetch({ updated: 1, skipped: 0, unmatched: 0, log: [] })
    render(<SyncResultsButton />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/sync-results', {
        method: 'POST',
        headers: { Authorization: 'Bearer admin-access-token' },
      })
    })
  })

  it('shows singular uitslag when updated === 1', async () => {
    mockFetch({ updated: 1, skipped: 0, unmatched: 0, log: [] })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText(/1 uitslag bijgewerkt/)).toBeInTheDocument()
    })
  })

  it('shows unmatched warning when unmatched > 0', async () => {
    mockFetch({ updated: 2, skipped: 0, unmatched: 2, log: [] })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText(/2 wedstrijden konden niet worden gekoppeld/)).toBeInTheDocument()
    })
  })

  it('shows singular unmatched text when unmatched === 1', async () => {
    mockFetch({ updated: 2, skipped: 0, unmatched: 1, log: [] })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText(/1 wedstrijd kon niet worden gekoppeld/)).toBeInTheDocument()
    })
  })

  it('shows log entries in details section on success', async () => {
    mockFetch({ updated: 2, skipped: 0, unmatched: 0, log: ['entry A', 'entry B'] })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText('entry A')).toBeInTheDocument()
      expect(screen.getByText('entry B')).toBeInTheDocument()
    })
  })

  it('shows none modal when no updates and no error', async () => {
    mockFetch({ updated: 0, message: 'Alles al bijgewerkt', skipped: 0 })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText('Geen nieuwe uitslagen')).toBeInTheDocument()
      expect(screen.getByText('Alles al bijgewerkt')).toBeInTheDocument()
    })
  })

  it('shows skipped count when skipped > 0 in none state', async () => {
    mockFetch({ updated: 0, message: 'Nothing new', skipped: 3 })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText(/3 wedstrijden waren al bijgewerkt/)).toBeInTheDocument()
    })
  })

  it('shows skipped singular when skipped === 1', async () => {
    mockFetch({ updated: 0, message: 'Nothing new', skipped: 1 })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText(/1 wedstrijd was al bijgewerkt/)).toBeInTheDocument()
    })
  })

  it('shows error modal when data.error is set (res.ok = true)', async () => {
    mockFetch({ error: 'Something went wrong', updated: 0 })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText('Er ging iets mis')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  it('shows error modal when res.ok is false', async () => {
    mockFetch({ error: 'Server fout' }, false)
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText('Er ging iets mis')).toBeInTheDocument()
      expect(screen.getByText('Server fout')).toBeInTheDocument()
    })
  })

  it('shows log in error modal when log is present', async () => {
    mockFetch({ error: 'Oops', log: ['err line 1'] }, false)
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText('err line 1')).toBeInTheDocument()
    })
  })

  it('shows network error message when fetch throws', async () => {
    mockFetch({}, true, true)
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText('Er ging iets mis')).toBeInTheDocument()
      expect(screen.getByText(/Verbinding met de server mislukt/)).toBeInTheDocument()
    })
  })

  it('closes modal via Sluiten button', async () => {
    mockFetch({ updated: 0, message: 'Nothing' })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText('Geen nieuwe uitslagen')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Sluiten'))
    expect(screen.queryByText('Geen nieuwe uitslagen')).not.toBeInTheDocument()
  })

  it('closes modal via backdrop click when not loading', async () => {
    mockFetch({ updated: 0, message: 'Nothing' })
    render(<SyncResultsButton />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => {
      expect(screen.getByText('Geen nieuwe uitslagen')).toBeInTheDocument()
    })
    // Click the backdrop (absolute inset-0 bg-black/40 div)
    const backdrop = document.querySelector('.absolute.inset-0.bg-black\\/40')!
    fireEvent.click(backdrop)
    expect(screen.queryByText('Geen nieuwe uitslagen')).not.toBeInTheDocument()
  })

  it('backdrop click during loading does nothing', async () => {
    // Fetch that never resolves
    global.fetch = jest.fn(() => new Promise(() => {}))
    render(<SyncResultsButton />)
    fireEvent.click(screen.getByRole('button', { name: /Uitslagen ophalen/ }))
    await waitFor(() => {
      expect(screen.getByText('Football-Data.org wordt geraadpleegd.')).toBeInTheDocument()
    })
    const backdrop = document.querySelector('.absolute.inset-0.bg-black\\/40')!
    fireEvent.click(backdrop)
    // Modal stays open
    expect(screen.getByText('Football-Data.org wordt geraadpleegd.')).toBeInTheDocument()
  })
})
