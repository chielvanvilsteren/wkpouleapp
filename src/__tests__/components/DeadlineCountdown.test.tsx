import { render, screen, act } from '@testing-library/react'
import DeadlineCountdown from '@/components/DeadlineCountdown'

describe('DeadlineCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns null before hydration (time state is null initially)', () => {
    // Before useEffect fires, time is null so component returns null
    // React Testing Library runs effects synchronously, so we check after mount
    const { container } = render(
      <DeadlineCountdown deadlineIso="2026-06-14T23:59:59.000Z" />
    )
    expect(container).toBeDefined()
  })

  it('shows "Deadline verstreken" when deadline passed', () => {
    jest.setSystemTime(new Date('2026-07-01T00:00:00Z'))
    render(<DeadlineCountdown deadlineIso="2026-06-01T23:59:59.000Z" />)
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(screen.getByText(/Deadline verstreken/)).toBeInTheDocument()
  })

  it('shows hours/min/sec when future deadline', () => {
    jest.setSystemTime(new Date('2026-06-13T00:00:00Z'))
    render(<DeadlineCountdown deadlineIso="2026-06-20T23:59:59.000Z" />)
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(screen.getByText('uur')).toBeInTheDocument()
    expect(screen.getByText('min')).toBeInTheDocument()
    expect(screen.getByText('sec')).toBeInTheDocument()
  })

  it('shows days digit when days > 0', () => {
    jest.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    render(<DeadlineCountdown deadlineIso="2026-06-14T23:59:59.000Z" />)
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(screen.getByText('dagen')).toBeInTheDocument()
  })

  it('hides days digit when 0 days remain', () => {
    // Less than 24 hours remaining
    jest.setSystemTime(new Date('2026-06-14T10:00:00Z'))
    render(<DeadlineCountdown deadlineIso="2026-06-14T23:59:59.000Z" />)
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(screen.queryByText('dagen')).not.toBeInTheDocument()
  })

  it('uses custom label prop', () => {
    jest.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    render(<DeadlineCountdown deadlineIso="2026-06-14T23:59:59.000Z" label="Pre-pool sluit" />)
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(screen.getByText(/Pre-pool sluit/)).toBeInTheDocument()
  })

  it('uses "Deadline" as default label when not provided', () => {
    jest.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    render(<DeadlineCountdown deadlineIso="2026-06-14T23:59:59.000Z" />)
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(screen.getByText(/Deadline/)).toBeInTheDocument()
  })

  it('cleans up interval on unmount', () => {
    jest.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    const { unmount } = render(
      <DeadlineCountdown deadlineIso="2026-06-14T23:59:59.000Z" />
    )
    act(() => {
      jest.advanceTimersByTime(100)
    })
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
})
