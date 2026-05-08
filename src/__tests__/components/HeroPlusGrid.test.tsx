import { render, screen, fireEvent, act } from '@testing-library/react'
import HeroPlusGrid from '@/components/HeroPlusGrid'

jest.mock('@/components/HeroPlusGrid', () => {
  const actual = jest.requireActual('@/components/HeroPlusGrid')
  return actual
})

// Mock getBoundingClientRect so click coordinates work
beforeEach(() => {
  Element.prototype.getBoundingClientRect = jest.fn(() => ({
    left: 0, top: 0, right: 800, bottom: 600,
    width: 800, height: 600, x: 0, y: 0, toJSON: () => {},
  }))
  // Mock animate so FlashPlus doesn't crash
  Element.prototype.animate = jest.fn(() => ({
    finished: Promise.resolve(),
    cancel: jest.fn(),
  } as unknown as Animation))
})

describe('HeroPlusGrid', () => {
  it('renders without crashing', () => {
    const onTripleClick = jest.fn()
    render(<HeroPlusGrid onTripleClick={onTripleClick} />)
    // The container div is present
    expect(document.querySelector('[style*="z-index"]')).toBeTruthy()
  })

  it('does not call onTripleClick when clicking away from a cross', () => {
    const onTripleClick = jest.fn()
    const { container } = render(<HeroPlusGrid onTripleClick={onTripleClick} />)
    const div = container.firstChild as HTMLElement
    // Click at (20, 20) — not on a cross center (5+30k = 5, 35, 65...)
    // Nearest cross is at (5,5), dx=15 > 6 → miss
    fireEvent.click(div, { clientX: 20, clientY: 20 })
    expect(onTripleClick).not.toHaveBeenCalled()
  })

  it('calls onTripleClick after 3 precise cross clicks', () => {
    const onTripleClick = jest.fn()
    const { container } = render(<HeroPlusGrid onTripleClick={onTripleClick} />)
    const div = container.firstChild as HTMLElement
    // Click precisely on cross at (5,5), (35,5), (5,35)
    fireEvent.click(div, { clientX: 5, clientY: 5 })
    fireEvent.click(div, { clientX: 35, clientY: 5 })
    fireEvent.click(div, { clientX: 5, clientY: 35 })
    expect(onTripleClick).toHaveBeenCalledTimes(1)
  })

  it('does not allow re-clicking the same cross', () => {
    const onTripleClick = jest.fn()
    const { container } = render(<HeroPlusGrid onTripleClick={onTripleClick} />)
    const div = container.firstChild as HTMLElement
    // Click same cross 3 times — should not count duplicates
    fireEvent.click(div, { clientX: 5, clientY: 5 })
    fireEvent.click(div, { clientX: 5, clientY: 5 })
    fireEvent.click(div, { clientX: 5, clientY: 5 })
    expect(onTripleClick).not.toHaveBeenCalled()
  })

  it('shows hover highlight when mouse is near a cross', () => {
    const { container } = render(<HeroPlusGrid onTripleClick={jest.fn()} />)
    const div = container.firstChild as HTMLElement
    fireEvent.mouseMove(div, { clientX: 5, clientY: 5 })
    // Cursor changes to pointer
    expect((div as HTMLElement).style.cursor).toBe('pointer')
  })

  it('clears hover when mouse leaves', () => {
    const { container } = render(<HeroPlusGrid onTripleClick={jest.fn()} />)
    const div = container.firstChild as HTMLElement
    fireEvent.mouseMove(div, { clientX: 5, clientY: 5 })
    fireEvent.mouseLeave(div)
    expect((div as HTMLElement).style.cursor).toBe('default')
  })

  it('cursor is default when mouse is not near a cross', () => {
    const { container } = render(<HeroPlusGrid onTripleClick={jest.fn()} />)
    const div = container.firstChild as HTMLElement
    fireEvent.mouseMove(div, { clientX: 20, clientY: 20 })
    expect((div as HTMLElement).style.cursor).toBe('default')
  })

  it('does nothing on click when container ref is not available (no getBoundingClientRect)', () => {
    // Simulate containerRef.current returning null by making getBoundingClientRect return null
    const origGetBCR = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => null as any)
    const onTripleClick = jest.fn()
    const { container } = render(<HeroPlusGrid onTripleClick={onTripleClick} />)
    const div = container.firstChild as HTMLElement
    fireEvent.click(div, { clientX: 5, clientY: 5 })
    expect(onTripleClick).not.toHaveBeenCalled()
    Element.prototype.getBoundingClientRect = origGetBCR
  })

  it('does nothing on mousemove when container ref is not available', () => {
    const origGetBCR = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => null as any)
    const { container } = render(<HeroPlusGrid onTripleClick={jest.fn()} />)
    const div = container.firstChild as HTMLElement
    // Should not throw
    fireEvent.mouseMove(div, { clientX: 5, clientY: 5 })
    expect((div as HTMLElement).style.cursor).toBe('default')
    Element.prototype.getBoundingClientRect = origGetBCR
  })

  it('flash useEffect setTimeout callback runs and clears expired flashes', () => {
    jest.useFakeTimers()
    const { container } = render(<HeroPlusGrid onTripleClick={jest.fn()} />)
    const div = container.firstChild as HTMLElement
    // Trigger a click to add a flash
    fireEvent.click(div, { clientX: 5, clientY: 5 })
    // Advance timers past FLASH_DURATION (1000ms) + buffer (50ms)
    act(() => {
      jest.advanceTimersByTime(1200)
    })
    jest.useRealTimers()
  })

  it('PlusMark fade useEffect runs animate when fade=true (via cross click)', () => {
    const onTripleClick = jest.fn()
    const { container } = render(<HeroPlusGrid onTripleClick={onTripleClick} />)
    const div = container.firstChild as HTMLElement
    // Click a cross — this creates a PlusMark with fade=true and a FlashPlus
    fireEvent.click(div, { clientX: 5, clientY: 5 })
    // animate should have been called (by FlashPlus and/or PlusMark fade)
    expect(Element.prototype.animate).toHaveBeenCalled()
  })

  it('hover clears correctly when hovered cross gets clicked (clicked.has(key) branch)', () => {
    const { container } = render(<HeroPlusGrid onTripleClick={jest.fn()} />)
    const div = container.firstChild as HTMLElement
    // First hover over a cross
    fireEvent.mouseMove(div, { clientX: 5, clientY: 5 })
    expect((div as HTMLElement).style.cursor).toBe('pointer')
    // Click it — marks it as clicked
    fireEvent.click(div, { clientX: 5, clientY: 5 })
    // Hover over it again — should no longer show pointer (key is in clicked)
    fireEvent.mouseMove(div, { clientX: 5, clientY: 5 })
    expect((div as HTMLElement).style.cursor).toBe('default')
  })

})
