import { render, act } from '@testing-library/react'
import DisplayRefresh from '@/app/display/DisplayRefresh'

const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

describe('DisplayRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders nothing (returns null)', () => {
    const { container } = render(<DisplayRefresh />)
    expect(container.firstChild).toBeNull()
  })

  it('calls router.refresh after 30 seconds', () => {
    render(<DisplayRefresh />)
    expect(mockRefresh).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(30000)
    })
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('calls router.refresh multiple times on interval', () => {
    render(<DisplayRefresh />)
    act(() => {
      jest.advanceTimersByTime(90000) // 3 x 30s
    })
    expect(mockRefresh).toHaveBeenCalledTimes(3)
  })

  it('clears interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    const { unmount } = render(<DisplayRefresh />)
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  it('does not call refresh before 30 seconds', () => {
    render(<DisplayRefresh />)
    act(() => {
      jest.advanceTimersByTime(29999)
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
