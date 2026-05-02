import { render, screen, act } from '@testing-library/react'
import RotatingFlag from '@/components/RotatingFlag'

jest.mock('@/components/WavingFlag', () => ({
  __esModule: true,
  default: ({ flagUrl, className }: { flagUrl?: string | null; className?: string }) => (
    <div data-testid="waving-flag" data-flag-url={flagUrl} className={className} />
  ),
}))

describe('RotatingFlag', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders WavingFlag with initial flag URL (index 0 = "nl")', () => {
    render(<RotatingFlag />)
    const flag = screen.getByTestId('waving-flag')
    expect(flag).toHaveAttribute('data-flag-url', expect.stringContaining('nl'))
  })

  it('advances to next flag after 1 second ("de")', () => {
    render(<RotatingFlag />)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    const flag = screen.getByTestId('waving-flag')
    expect(flag).toHaveAttribute('data-flag-url', expect.stringContaining('de'))
  })

  it('advances through multiple flags', () => {
    render(<RotatingFlag />)
    act(() => {
      jest.advanceTimersByTime(2000) // index 2 = "fr"
    })
    const flag = screen.getByTestId('waving-flag')
    expect(flag).toHaveAttribute('data-flag-url', expect.stringContaining('fr'))
  })

  it('passes className prop through', () => {
    render(<RotatingFlag className="rounded-lg" />)
    const flag = screen.getByTestId('waving-flag')
    expect(flag).toHaveClass('rounded-lg')
  })

  it('clears interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    const { unmount } = render(<RotatingFlag />)
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  it('wraps around when all flags exhausted', () => {
    render(<RotatingFlag />)
    // WC_2026_CODES has 58 entries, advance 58 seconds to wrap around
    act(() => {
      jest.advanceTimersByTime(58000)
    })
    const flag = screen.getByTestId('waving-flag')
    // Should wrap back to index 0 ("nl")
    expect(flag).toHaveAttribute('data-flag-url', expect.stringContaining('nl'))
  })
})
