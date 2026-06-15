import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import AdminFlappyCredits from '@/components/AdminFlappyCredits'

const mockUsers = [
  {
    id: 'user-1',
    display_name: 'Alice',
    prePouleCredits: 3,
    wkCredits: 2,
    manualGrants: 1,
    spent: 2,
    available: 4,
  },
  {
    id: 'user-2',
    display_name: 'Bob',
    prePouleCredits: 0,
    wkCredits: 1,
    manualGrants: 0,
    spent: 1,
    available: 0,
  },
]

function setupFetch(users = mockUsers) {
  global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    if (method === 'GET' || method === undefined || !init?.method) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(users),
      } as Response)
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response)
  })
}

describe('AdminFlappyCredits', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllTimers()
  })

  it('shows loading state initially', () => {
    // Fetch that never resolves so loading remains
    global.fetch = jest.fn(() => new Promise(() => {}))
    render(<AdminFlappyCredits />)
    expect(screen.getByText('Laden...')).toBeInTheDocument()
  })

  it('renders table after load', async () => {
    setupFetch()
    render(<AdminFlappyCredits />)
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
    // Table headers
    expect(screen.getByText('Naam')).toBeInTheDocument()
    expect(screen.getByText(/Beschikbaar/)).toBeInTheDocument()
  })

  it('renders empty state when no users', async () => {
    setupFetch([])
    render(<AdminFlappyCredits />)
    await waitFor(() => {
      expect(screen.getByText('Geen deelnemers gevonden.')).toBeInTheDocument()
    })
  })

  it('shows "+N" for adminGrants > 0', async () => {
    setupFetch()
    render(<AdminFlappyCredits />)
    await waitFor(() => {
      expect(screen.getByText('+1')).toBeInTheDocument()
    })
  })

  it('shows "—" when adminGrants === 0', async () => {
    setupFetch()
    render(<AdminFlappyCredits />)
    await waitFor(() => {
      // Bob has adminGrants 0
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThan(0)
    })
  })

  it('shows "−N" when spent > 0', async () => {
    setupFetch()
    render(<AdminFlappyCredits />)
    await waitFor(() => {
      // Alice has spent 2
      expect(screen.getByText('−2')).toBeInTheDocument()
    })
  })

  it('shows "—" when spent === 0', async () => {
    setupFetch()
    render(<AdminFlappyCredits />)
    await waitFor(() => {
      // Bob has spent 0 → "—"
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThan(0)
    })
  })

  it('renders available > 0 with oranje color class', async () => {
    setupFetch()
    render(<AdminFlappyCredits />)
    await waitFor(() => {
      // Alice available = 4
      expect(screen.getByText('4')).toBeInTheDocument()
    })
    const availableSpan = screen.getByText('4')
    expect(availableSpan.className).toContain('text-oranje-500')
  })

  it('renders available === 0 with gray color class', async () => {
    setupFetch()
    render(<AdminFlappyCredits />)
    await waitFor(() => {
      // Bob available = 0
      expect(screen.getByText('0')).toBeInTheDocument()
    })
    const availableSpan = screen.getByText('0')
    expect(availableSpan.className).toContain('text-gray-400')
  })

  it('grants credits on button click (success path)', async () => {
    jest.useFakeTimers()
    let callCount = 0
    global.fetch = jest.fn(() => {
      callCount++
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(callCount === 1 ? mockUsers : mockUsers),
      } as Response)
    })

    render(<AdminFlappyCredits />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    const grantButtons = screen.getAllByText('Ken toe')
    await act(async () => {
      fireEvent.click(grantButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText('+1 toegekend')).toBeInTheDocument()
    })

    // After 3 seconds feedback clears
    act(() => { jest.advanceTimersByTime(3000) })
    await waitFor(() => {
      expect(screen.queryByText('+1 toegekend')).not.toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it('shows error feedback on failed grant', async () => {
    let callCount = 0
    global.fetch = jest.fn(() => {
      callCount++
      if (callCount === 1) {
        // Initial load
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        } as Response)
      }
      // Grant fails
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Grant failed' }),
      } as Response)
    })

    render(<AdminFlappyCredits />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    const grantButtons = screen.getAllByText('Ken toe')
    await act(async () => {
      fireEvent.click(grantButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText('Grant failed')).toBeInTheDocument()
    })
  })

  it('shows "Fout" when error response has no error field', async () => {
    let callCount = 0
    global.fetch = jest.fn(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        } as Response)
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response)
    })

    render(<AdminFlappyCredits />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    const grantButtons = screen.getAllByText('Ken toe')
    await act(async () => {
      fireEvent.click(grantButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText('Fout')).toBeInTheDocument()
    })
  })

  it('clamps amount input to min 1, max 100', async () => {
    setupFetch()
    render(<AdminFlappyCredits />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    const inputs = screen.getAllByRole('spinbutton')
    // Enter 0 → clamped to 1
    fireEvent.change(inputs[0], { target: { value: '0' } })
    expect(inputs[0]).toHaveValue(1)

    // Enter 200 → clamped to 100
    fireEvent.change(inputs[0], { target: { value: '200' } })
    expect(inputs[0]).toHaveValue(100)

    // Enter invalid string → defaults to 1
    fireEvent.change(inputs[0], { target: { value: 'abc' } })
    expect(inputs[0]).toHaveValue(1)
  })

  it('updates note input', async () => {
    setupFetch()
    render(<AdminFlappyCredits />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    const noteInputs = screen.getAllByPlaceholderText('Reden (opt.)')
    fireEvent.change(noteInputs[0], { target: { value: 'Bonus' } })
    expect(noteInputs[0]).toHaveValue('Bonus')
  })

  it('does not render table when fetch returns non-ok on load', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve([]),
      } as Response)
    )
    render(<AdminFlappyCredits />)
    await waitFor(() => {
      // setUsers is only called on res.ok, so users remains []
      expect(screen.getByText('Geen deelnemers gevonden.')).toBeInTheDocument()
    })
  })

  it('shows "..." on the button while granting', async () => {
    let resolveGrant: (v: Response) => void
    let callCount = 0

    global.fetch = jest.fn(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        } as Response)
      }
      // Grant promise that we control
      return new Promise<Response>((resolve) => { resolveGrant = resolve })
    })

    render(<AdminFlappyCredits />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    const grantButtons = screen.getAllByText('Ken toe')
    fireEvent.click(grantButtons[0])

    await waitFor(() => {
      expect(screen.getByText('...')).toBeInTheDocument()
    })

    // Resolve the grant
    await act(async () => {
      resolveGrant!({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      } as Response)
    })
  })
})
