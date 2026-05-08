import React from 'react'
import { render, screen, act } from '@testing-library/react'
import GameTransition from '@/components/GameTransition'

// ── Canvas mock ───────────────────────────────────────────────────────────────
const mockCtx = {
  fillStyle: '' as string | CanvasGradient | CanvasPattern,
  strokeStyle: '' as string | CanvasGradient | CanvasPattern,
  lineWidth: 0,
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  arc: jest.fn(),
  ellipse: jest.fn(),
  createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  clip: jest.fn(),
  closePath: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  fillText: jest.fn(),
  strokeText: jest.fn(),
  setLineDash: jest.fn(),
  drawImage: jest.fn(),
}

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCtx)
})

beforeEach(() => {
  jest.clearAllMocks()
  // Use the jest.setup.ts default: rAF is jest.fn(() => 0) — does NOT call the
  // callback, preventing infinite animation loops.
  global.cancelAnimationFrame = jest.fn()
})

describe('GameTransition', () => {
  it('renders a canvas element', () => {
    const { container } = render(<GameTransition />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('renders BONUS GAME and WK POULE 2026 text when showText=true', () => {
    render(<GameTransition showText={true} />)
    expect(screen.getByText('BONUS GAME')).toBeInTheDocument()
    expect(screen.getByText('WK POULE 2026')).toBeInTheDocument()
  })

  it('does not render text content when showText=false', () => {
    render(<GameTransition showText={false} />)
    expect(screen.queryByText('BONUS GAME')).not.toBeInTheDocument()
    expect(screen.queryByText('WK POULE 2026')).not.toBeInTheDocument()
  })

  it('calls onComplete after ~4500ms when showText=true', () => {
    jest.useFakeTimers()
    const onComplete = jest.fn()
    render(<GameTransition showText={true} onComplete={onComplete} />)
    expect(onComplete).not.toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(4500) })
    expect(onComplete).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('does not call onComplete when showText=false', () => {
    jest.useFakeTimers()
    const onComplete = jest.fn()
    render(<GameTransition showText={false} onComplete={onComplete} />)
    act(() => { jest.advanceTimersByTime(10000) })
    expect(onComplete).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('does not call onComplete when no onComplete prop is provided', () => {
    jest.useFakeTimers()
    // Should not throw
    expect(() => {
      render(<GameTransition showText={true} />)
      act(() => { jest.advanceTimersByTime(5000) })
    }).not.toThrow()
    jest.useRealTimers()
  })

  it('handles window resize event without errors', () => {
    const { unmount } = render(<GameTransition />)
    // Trigger resize — should not throw
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    unmount()
  })

  it('calls cancelAnimationFrame on unmount', () => {
    const { unmount } = render(<GameTransition />)
    unmount()
    expect(global.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('removes resize event listener on unmount', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener')
    const { unmount } = render(<GameTransition />)
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('draws on canvas context when animation runs', () => {
    render(<GameTransition />)
    // At least fillRect should have been called by the animation
    expect(mockCtx.fillRect).toHaveBeenCalled()
  })
})
