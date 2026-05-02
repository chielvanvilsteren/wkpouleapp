import { render, act } from '@testing-library/react'
import WavingFlag from '@/components/WavingFlag'

// Three.js is mocked via __mocks__/three.ts (auto-hoisted by Jest)

// Mock ResizeObserver — triggers callback immediately on observe()
class MockResizeObserver {
  private cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) { this.cb = cb }
  observe = jest.fn().mockImplementation(() => { this.cb([], this as unknown as ResizeObserver) })
  disconnect = jest.fn()
  unobserve = jest.fn()
}

// Mock canvas getContext so makeDutchTexture() doesn't crash in jsdom
const mockCtx = {
  fillStyle: '',
  fillRect: jest.fn(),
}
const originalCreateElement = document.createElement.bind(document)

beforeAll(() => {
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
  jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = originalCreateElement(tag)
    if (tag === 'canvas') {
      jest.spyOn(el as HTMLCanvasElement, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D)
    }
    return el
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('WavingFlag', () => {
  it('renders a div container', () => {
    const { container } = render(<WavingFlag />)
    // The component renders a div with mountRef
    expect(container.firstChild).toBeInTheDocument()
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  it('applies className to container', () => {
    const { container } = render(<WavingFlag className="custom-class" />)
    const div = container.querySelector('div')
    expect(div).toHaveClass('custom-class')
  })

  it('applies aspect ratio style', () => {
    const { container } = render(<WavingFlag />)
    const div = container.querySelector('div')
    expect(div?.style.aspectRatio).toBeTruthy()
  })

  it('creates WebGLRenderer on mount', async () => {
    const THREE = await import('three')
    render(<WavingFlag />)
    expect(THREE.WebGLRenderer).toHaveBeenCalled()
  })

  it('creates Scene on mount', async () => {
    const THREE = await import('three')
    jest.clearAllMocks()
    render(<WavingFlag />)
    expect(THREE.Scene).toHaveBeenCalled()
  })

  it('creates PerspectiveCamera on mount', async () => {
    const THREE = await import('three')
    jest.clearAllMocks()
    render(<WavingFlag />)
    expect(THREE.PerspectiveCamera).toHaveBeenCalled()
  })

  it('calls cancelAnimationFrame on unmount', () => {
    const { unmount } = render(<WavingFlag />)
    unmount()
    expect(global.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('renders with flagUrl prop without crashing', () => {
    const { container } = render(<WavingFlag flagUrl="https://flagcdn.com/w320/nl.png" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders with null flagUrl without crashing', () => {
    const { container } = render(<WavingFlag flagUrl={null} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('updates texture when flagUrl changes', async () => {
    const THREE = await import('three')
    jest.clearAllMocks()
    const { rerender } = render(<WavingFlag />)
    rerender(<WavingFlag flagUrl="https://flagcdn.com/w320/de.png" />)
    expect(THREE.TextureLoader).toHaveBeenCalled()
  })
})
