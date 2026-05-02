import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminToggles from '@/components/AdminToggles'

const mockEq = jest.fn(() => Promise.resolve({ error: null }))
const mockUpdate = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ update: mockUpdate }))
const mockCreateClient = jest.fn(() => ({ from: mockFrom }))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockCreateClient(),
}))

const defaultProps = {
  inzendingen_open: false,
  inzendingen_deadline: null,
  scores_zichtbaar: false,
  wk_poule_open: false,
  wk_poule_deadline: null,
  wk_scores_zichtbaar: false,
}

describe('AdminToggles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEq.mockResolvedValue({ error: null })
  })

  it('renders all toggles', () => {
    render(<AdminToggles {...defaultProps} />)
    expect(screen.getByText('Inzendingen open')).toBeInTheDocument()
    expect(screen.getByText('Scores zichtbaar')).toBeInTheDocument()
    expect(screen.getByText(/WK Poule open/)).toBeInTheDocument()
    expect(screen.getByText('WK Scores zichtbaar')).toBeInTheDocument()
  })

  it('renders toggles with initial state (all off)', () => {
    render(<AdminToggles {...defaultProps} />)
    const switches = screen.getAllByRole('switch')
    switches.forEach((sw) => {
      expect(sw).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('renders toggles with initial state (all on)', () => {
    render(<AdminToggles
      {...defaultProps}
      inzendingen_open
      scores_zichtbaar
      wk_poule_open
      wk_scores_zichtbaar
    />)
    const switches = screen.getAllByRole('switch')
    switches.forEach((sw) => {
      expect(sw).toHaveAttribute('aria-checked', 'true')
    })
  })

  it('toggle click calls supabase update', async () => {
    render(<AdminToggles {...defaultProps} />)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('master_uitslag')
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 1)
    })
  })

  it('shows success status after successful save', async () => {
    render(<AdminToggles {...defaultProps} />)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    await waitFor(() => {
      expect(screen.getByText(/Instelling opgeslagen/)).toBeInTheDocument()
    })
  })

  it('shows error status when save fails', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } })
    render(<AdminToggles {...defaultProps} />)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    await waitFor(() => {
      expect(screen.getByText(/Opslaan mislukt/)).toBeInTheDocument()
    })
  })

  it('reverts toggle on error', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } })
    render(<AdminToggles {...defaultProps} inzendingen_open={false} />)
    const switches = screen.getAllByRole('switch')
    // Toggle was false, click to set true, then it should revert to false on error
    fireEvent.click(switches[0])
    await waitFor(() => {
      expect(switches[0]).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('reverts scores_zichtbaar toggle on error', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } })
    render(<AdminToggles {...defaultProps} scores_zichtbaar={false} />)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[1])
    await waitFor(() => {
      expect(switches[1]).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('reverts wk_poule_open toggle on error', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } })
    render(<AdminToggles {...defaultProps} wk_poule_open={false} />)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[2])
    await waitFor(() => {
      expect(switches[2]).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('reverts wk_scores_zichtbaar toggle on error', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } })
    render(<AdminToggles {...defaultProps} wk_scores_zichtbaar={false} />)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[3])
    await waitFor(() => {
      expect(switches[3]).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('shows Wissen button when deadline is set', () => {
    render(<AdminToggles {...defaultProps} inzendingen_deadline="2026-06-14T23:59:59.000Z" />)
    expect(screen.getAllByText('Wissen').length).toBeGreaterThan(0)
  })

  it('does not show Wissen button when no deadline', () => {
    render(<AdminToggles {...defaultProps} />)
    expect(screen.queryByText('Wissen')).not.toBeInTheDocument()
  })

  it('shows deadline summary text when deadline set', () => {
    render(<AdminToggles {...defaultProps} inzendingen_deadline="2026-06-14T23:59:59.000Z" />)
    expect(screen.getAllByText(/Sluit:/).length).toBeGreaterThan(0)
  })

  it('clicking Wissen clears deadline and saves', async () => {
    render(<AdminToggles {...defaultProps} inzendingen_deadline="2026-06-14T23:59:59.000Z" />)
    const wissenButtons = screen.getAllByText('Wissen')
    fireEvent.click(wissenButtons[0])
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  it('changing pre-pool deadline input to non-empty value saves ISO string', async () => {
    const { container } = render(<AdminToggles {...defaultProps} />)
    const dateInputs = container.querySelectorAll('input[type="date"]')
    fireEvent.change(dateInputs[0], { target: { value: '2026-06-14' } })
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ inzendingen_deadline: expect.any(String) })
      )
    })
  })

  it('changing WK deadline input calls saveWkDeadline', async () => {
    const { container } = render(<AdminToggles {...defaultProps} />)
    const dateInputs = container.querySelectorAll('input[type="date"]')
    // Second date input is the WK deadline
    fireEvent.change(dateInputs[1], { target: { value: '2026-07-19' } })
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ wk_poule_deadline: expect.any(String) })
      )
    })
  })

  it('clearing WK deadline saves null', async () => {
    const { container } = render(<AdminToggles {...defaultProps} wk_poule_deadline="2026-07-19T23:59:59.000Z" />)
    const wissenButtons = screen.getAllByText('Wissen')
    // Click the WK deadline Wissen button (second one)
    fireEvent.click(wissenButtons[wissenButtons.length - 1])
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ wk_poule_deadline: null })
      )
    })
  })
})
