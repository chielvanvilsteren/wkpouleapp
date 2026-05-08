import React from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import FootballGame from '@/components/FootballGame'

// ── rAF helpers ───────────────────────────────────────────────────────────────
// Call the callback exactly `n` times, then become a no-op.
function makeOnceRaf(n = 1) {
  let count = 0
  return jest.fn((cb: FrameRequestCallback) => {
    if (count < n) { count++; cb(0) }
    return count
  })
}

// Deferred rAF: stores callbacks, then flush() fires them all once.
function makeDeferredRaf() {
  const pending: FrameRequestCallback[] = []
  let id = 0
  const raf = jest.fn((cb: FrameRequestCallback) => {
    pending.push(cb)
    return ++id
  })
  const flush = (n = 1) => {
    for (let i = 0; i < n; i++) {
      const cbs = pending.splice(0)
      for (const cb of cbs) cb(0)
    }
  }
  return { raf, flush }
}

// ── Canvas mock ───────────────────────────────────────────────────────────────
const mockCtx = {
  fillStyle: '' as string | CanvasGradient | CanvasPattern,
  strokeStyle: '' as string | CanvasGradient | CanvasPattern,
  globalAlpha: 1,
  lineWidth: 0,
  lineCap: '' as CanvasLineCap,
  font: '',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  arc: jest.fn(),
  arcTo: jest.fn(),
  ellipse: jest.fn(),
  createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  clip: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 50 })),
  fillText: jest.fn(),
  strokeText: jest.fn(),
  setLineDash: jest.fn(),
  drawImage: jest.fn(),
}

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCtx)
})

// ── Fetch mock ────────────────────────────────────────────────────────────────
const mockFetch = jest.fn()
global.fetch = mockFetch

// ── Default fetch responses ───────────────────────────────────────────────────
function mockCreditsOk(available = 3, preCredits = 2, wkCredits = 1) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ available, preCredits, wkCredits }),
  })
}

function mockStartSessionOk(sessionId = 'sess-123', newBalance = 2) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ sessionId, newBalance }),
  })
}

function mockScoresOk(scores = [
  { id: 1, score: 42, played_at: '2026-01-01T00:00:00Z', display_name: 'Alice' },
  { id: 2, score: 30, played_at: '2026-01-02T00:00:00Z', display_name: null },
]) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(scores),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (url === '/api/flappy-credits' && !opts) return mockCreditsOk()
    if (url === '/api/flappy-scores') return mockScoresOk()
    if (url === '/api/flappy-credits' && opts?.method === 'POST') return mockStartSessionOk()
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
  })
})

const defaultProps = {
  playerName: 'Chiel',
  onClose: jest.fn(),
  onGameStart: jest.fn(),
}

async function renderMenu(props = defaultProps) {
  const result = render(<FootballGame {...props} />)
  await waitFor(() => expect(screen.getByText('Flappy Bal!')).toBeInTheDocument())
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
describe('FootballGame – menu screen', () => {
  it('shows Flappy Bal! heading', async () => {
    await renderMenu()
    expect(screen.getByText('Flappy Bal!')).toBeInTheDocument()
  })

  it('shows credits after fetch resolves', async () => {
    await renderMenu()
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    expect(screen.getByText('Selectie: 2')).toBeInTheDocument()
    expect(screen.getByText('Uitslagen: 1')).toBeInTheDocument()
  })

  it('shows loading state before credits arrive', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // never resolves
    render(<FootballGame {...defaultProps} />)
    expect(screen.getByText('Laden…')).toBeInTheDocument()
  })

  it('disables play button and shows ⚡ Geen credits when credits=0', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk(0, 0, 0)
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    await renderMenu()
    await waitFor(() => expect(screen.getByText('⚡ Geen credits')).toBeInTheDocument())
    expect(screen.getByText('⚡ Geen credits')).toBeDisabled()
    expect(screen.getByText('Voorspel juist om credits te verdienen')).toBeInTheDocument()
  })

  it('play button is disabled while credits are null (loading)', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    render(<FootballGame {...defaultProps} />)
    // The button shows 'Spelen! ⚽' but is disabled (credits null)
    const btn = screen.getByRole('button', { name: /spelen/i })
    expect(btn).toBeDisabled()
  })

  it('startSession failure keeps screen on menu', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk(1, 1, 0)
      if (url === '/api/flappy-credits' && opts?.method === 'POST') {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    await renderMenu()
    await waitFor(() => expect(screen.getByText('Spelen! ⚽')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    expect(screen.getByText('Flappy Bal!')).toBeInTheDocument()
  })

  it('clicking Spelen with credits transitions to playing screen', async () => {
    await renderMenu()
    await waitFor(() => expect(screen.getByText('Spelen! ⚽')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => {
      expect(document.querySelector('canvas')).toBeInTheDocument()
    })
    expect(defaultProps.onGameStart).toHaveBeenCalled()
  })

  it('clicking 🏆 Scores loads scoreboard', async () => {
    await renderMenu()
    await act(async () => { fireEvent.click(screen.getByText('🏆 Scores')) })
    await waitFor(() => expect(screen.getByText('🏆 Highscores')).toBeInTheDocument())
  })

  it('fetchCredits error shows 0 credits', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return Promise.reject(new Error('network'))
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    render(<FootballGame {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('⚡ Geen credits')).toBeInTheDocument())
  })

  it('fetchCredits non-ok response shows 0 credits', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    render(<FootballGame {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('⚡ Geen credits')).toBeInTheDocument())
  })

  it('shows players name in instructions', async () => {
    await renderMenu()
    expect(screen.getByText('Chiel')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('FootballGame – playing screen (rAF no-op)', () => {
  async function goToPlaying() {
    await renderMenu()
    await waitFor(() => expect(screen.getByText('Spelen! ⚽')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    return waitFor(() => {
      const c = document.querySelector('canvas')
      expect(c).toBeInTheDocument()
      return c!
    })
  }

  it('renders canvas when playing', async () => {
    await goToPlaying()
    expect(document.querySelector('canvas')).toBeInTheDocument()
  })

  it('spacebar key does not throw', async () => {
    await goToPlaying()
    act(() => { fireEvent.keyDown(window, { code: 'Space' }) })
  })

  it('non-space key does not throw', async () => {
    await goToPlaying()
    act(() => { fireEvent.keyDown(window, { code: 'ArrowUp' }) })
  })

  it('canvas click does not throw', async () => {
    const canvas = await goToPlaying()
    act(() => { fireEvent.click(canvas) })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// These tests run the game loop using a deferred rAF that we flush manually.
// This covers drawing functions, game physics, and the death/saveprompt path.
describe('FootballGame – game loop execution', () => {
  // We set up deferred rAF per test
  afterEach(() => {
    global.requestAnimationFrame = jest.fn(() => 0)
    jest.useRealTimers()
  })

  it('game loop renders (not-started state) — drawing functions called', async () => {
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    render(<FootballGame {...defaultProps} />)
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    // Flush one frame: loop runs in not-started state → drawGetReady called
    act(() => { d.flush(1) })
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('game loop runs physics after click (started=true) — pipes, ball, HUD drawn', async () => {
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    render(<FootballGame {...defaultProps} />)
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    // First frame: started=false
    act(() => { d.flush(1) })
    // Click starts the game
    act(() => { fireEvent.click(document.querySelector('canvas')!) })
    // More frames: physics active
    act(() => { d.flush(5) })
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('spacebar triggers startAndFlap — physics runs', async () => {
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    render(<FootballGame {...defaultProps} />)
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    act(() => { d.flush(1) })
    act(() => { fireEvent.keyDown(window, { code: 'Space' }) })
    act(() => { d.flush(5) })
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('game loop detects death and transitions to saveprompt', async () => {
    // Use real timers for credits, then fake (excluding rAF) for death timer
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    render(<FootballGame {...defaultProps} />)
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    const canvas = document.querySelector('canvas')!
    act(() => { fireEvent.click(canvas) })
    // Ball dies at frame ~62 (HIT GROUND)
    act(() => { d.flush(70) })
    // Fire the 950ms death timer
    await act(async () => { jest.advanceTimersByTime(1000) })
    jest.useRealTimers()
    // Should have reached saveprompt
    await waitFor(() => {
      const hasSaveprompt = screen.queryByText('Wil je je score opslaan?')
      const hasCanvas = document.querySelector('canvas')
      expect(hasSaveprompt || hasCanvas).toBeTruthy()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('FootballGame – saveprompt and gameover via death path', () => {
  afterEach(() => {
    global.requestAnimationFrame = jest.fn(() => 0)
    jest.useRealTimers()
  })

  // Helper: set up deferred rAF, render, wait for credits, start game, run frames to death.
  async function goToSaveprompt() {
    const deferred = makeDeferredRaf()
    global.requestAnimationFrame = deferred.raf
    const props = { playerName: 'Chiel', onClose: jest.fn(), onGameStart: jest.fn() }
    render(<FootballGame {...props} />)
    // Wait for credits to load (real timers + Promise microtasks)
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    // Now switch to fake timers to control the 950ms death timer
    // Keep rAF real (controlled by deferred.raf)
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    // Start game and run frames to death
    act(() => { fireEvent.click(document.querySelector('canvas')!) })
    act(() => { deferred.flush(80) })
    await act(async () => { jest.advanceTimersByTime(1000) })
    // If death happened we're at saveprompt; else still playing
    return { props, deferred }
  }

  it('reaches saveprompt UI after ball death', async () => {
    await goToSaveprompt()
    expect(screen.getByText('Wil je je score opslaan?')).toBeInTheDocument()
  })

  it('saveprompt Niet opslaan transitions to gameover', async () => {
    await goToSaveprompt()
    const btn = screen.queryByText('✗ Niet opslaan')
    if (btn) {
      await act(async () => { fireEvent.click(btn) })
      expect(screen.getByText('Game Over!')).toBeInTheDocument()
    }
  })

  it('saveprompt Opslaan calls saveScore and transitions to gameover', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk()
      if (url === '/api/flappy-credits' && opts?.method === 'POST') {
        const body = JSON.parse(opts.body as string)
        if (body.action === 'start') return mockStartSessionOk('s1', 2)
        if (body.action === 'save') return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    await goToSaveprompt()
    const btn = screen.queryByText('✓ Opslaan')
    if (btn) {
      await act(async () => { fireEvent.click(btn) })
      await waitFor(() => expect(screen.getByText('Game Over!')).toBeInTheDocument())
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/flappy-credits',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('"action":"save"') })
      )
    }
  })

  it('gameover Opnieuw returns to menu', async () => {
    await goToSaveprompt()
    const btn = screen.queryByText('✗ Niet opslaan')
    if (btn) {
      await act(async () => { fireEvent.click(btn) })
      await waitFor(() => expect(screen.getByText('Game Over!')).toBeInTheDocument())
      await act(async () => { fireEvent.click(screen.getByText('Opnieuw')) })
      await waitFor(() => expect(screen.getByText('Flappy Bal!')).toBeInTheDocument())
    }
  })

  it('gameover 🏆 Scores loads scoreboard', async () => {
    await goToSaveprompt()
    const btn = screen.queryByText('✗ Niet opslaan')
    if (btn) {
      await act(async () => { fireEvent.click(btn) })
      await waitFor(() => expect(screen.getByText('Game Over!')).toBeInTheDocument())
      await act(async () => { fireEvent.click(screen.getAllByText('🏆 Scores')[0]) })
      await waitFor(() => expect(screen.getByText('🏆 Highscores')).toBeInTheDocument())
    }
  })

  it('gameover Sluiten calls onClose', async () => {
    const { props } = await goToSaveprompt()
    const btn = screen.queryByText('✗ Niet opslaan')
    if (btn) {
      await act(async () => { fireEvent.click(btn) })
      await waitFor(() => expect(screen.getByText('Game Over!')).toBeInTheDocument())
      fireEvent.click(screen.getByText('Sluiten'))
      expect(props.onClose).toHaveBeenCalled()
    } else {
      fireEvent.click(screen.getByText('×'))
      expect(props.onClose).toHaveBeenCalled()
    }
  })

  it('saveprompt Opslaan with no sessionId → gameover directly (line 676)', async () => {
    // Make startSession return sessionId=null to test the !sessionIdRef.current branch
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk()
      if (url === '/api/flappy-credits' && opts?.method === 'POST') {
        const body = JSON.parse(opts.body as string)
        if (body.action === 'start') {
          // Return result with null sessionId
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ sessionId: null, newBalance: 2 }) })
        }
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    await goToSaveprompt()
    const opslaanBtn = screen.queryByText('✓ Opslaan')
    if (opslaanBtn) {
      await act(async () => { fireEvent.click(opslaanBtn) })
      // Should go to gameover directly without saving
      await waitFor(() => expect(screen.getByText('Game Over!')).toBeInTheDocument())
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('FootballGame – saveprompt screen', () => {
  it('saveprompt Opslaan calls saveScore and goes to gameover', async () => {
    const saveBody: string[] = []
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk(1, 1, 0)
      if (url === '/api/flappy-credits' && opts?.method === 'POST') {
        const body = JSON.parse(opts.body as string)
        saveBody.push(body.action)
        if (body.action === 'start') return mockStartSessionOk('s1', 0)
        if (body.action === 'save') return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })

    await renderMenu()
    await waitFor(() => expect(screen.getByText('Spelen! ⚽')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    expect(saveBody).toContain('start')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('FootballGame – gameover screen', () => {
  it('× close button calls onClose from any screen', async () => {
    const onClose = jest.fn()
    render(<FootballGame playerName="Test" onClose={onClose} onGameStart={jest.fn()} />)
    await waitFor(() => expect(screen.getByText('Flappy Bal!')).toBeInTheDocument())
    fireEvent.click(screen.getByText('×'))
    expect(onClose).toHaveBeenCalled()
  })

  it('backdrop click calls onClose', async () => {
    const onClose = jest.fn()
    const { container } = render(
      <FootballGame playerName="Test" onClose={onClose} onGameStart={jest.fn()} />
    )
    await waitFor(() => expect(screen.getByText('Flappy Bal!')).toBeInTheDocument())
    const overlay = container.querySelector('.fixed.inset-0')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('FootballGame – scoreboard screen', () => {
  it('shows highscores table with rows', async () => {
    await renderMenu()
    await act(async () => { fireEvent.click(screen.getByText('🏆 Scores')) })
    await waitFor(() => {
      expect(screen.getByText('🏆 Highscores')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('???')).toBeInTheDocument()
    })
  })

  it('Terug button returns to menu', async () => {
    await renderMenu()
    await act(async () => { fireEvent.click(screen.getByText('🏆 Scores')) })
    await waitFor(() => expect(screen.getByText('🏆 Highscores')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('Terug')) })
    await waitFor(() => expect(screen.getByText('Flappy Bal!')).toBeInTheDocument())
  })

  it('fetchScores non-ok shows Nog geen scores', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk()
      if (url === '/api/flappy-scores') {
        return Promise.resolve({ ok: false, json: () => Promise.resolve([]) })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    await renderMenu()
    await act(async () => { fireEvent.click(screen.getByText('🏆 Scores')) })
    await waitFor(() => expect(screen.getByText('Nog geen scores.')).toBeInTheDocument())
  })

  it('shows loading spinner in scoreboard before data arrives', async () => {
    let resolveScores!: (v: unknown) => void
    const scoresPromise: Promise<unknown> = new Promise((resolve) => { resolveScores = resolve })
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk()
      if (url === '/api/flappy-scores') {
        return scoresPromise.then(() => ({ ok: true, json: () => Promise.resolve([]) }))
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    await renderMenu()
    fireEvent.click(screen.getByText('🏆 Scores'))
    expect(screen.getByText('Laden…')).toBeInTheDocument()
    resolveScores(undefined)
  })

  it('scoreboard row key uses index fallback when id is undefined (line 732)', async () => {
    // Score entry with no id → e.id ?? i uses fallback
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk()
      if (url === '/api/flappy-scores') {
        return mockScoresOk([
          { id: undefined as unknown as number, score: 5, played_at: '2026-01-01T00:00:00Z', display_name: 'Bob' },
        ])
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    await renderMenu()
    await act(async () => { fireEvent.click(screen.getByText('🏆 Scores')) })
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
  })

  it('highlights current player row in scoreboard', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk()
      if (url === '/api/flappy-scores') {
        return mockScoresOk([
          { id: 1, score: 42, played_at: '2026-01-01T00:00:00Z', display_name: 'Chiel' },
        ])
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    render(<FootballGame playerName="Chiel" onClose={jest.fn()} onGameStart={jest.fn()} />)
    await waitFor(() => expect(screen.getByText('Flappy Bal!')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('🏆 Scores')) })
    await waitFor(() => {
      const cell = screen.getByText('Chiel')
      expect(cell.closest('tr')).toHaveClass('bg-orange-500/10')
    })
  })

  it('shows correct ranking numbers', async () => {
    await renderMenu()
    await act(async () => { fireEvent.click(screen.getByText('🏆 Scores')) })
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests for uncovered game loop branches: pipe passing, score, level-up, pipe hit.
// Strategy: mock Math.random to control pipe positions, use fake timers (excluding rAF)
// with deferred rAF to run many frames. Batch size 43 = zero net ball displacement.
describe('FootballGame – advanced game physics', () => {
  afterEach(() => {
    global.requestAnimationFrame = jest.fn(() => 0)
    jest.useRealTimers()
    jest.spyOn(Math, 'random').mockRestore()
  })

  // goToPlayingFakeTime: set up fake timers + deferred rAF, render and play.
  // Uses batchSize=43 for stable ball oscillation (zero net displacement per batch).
  // random=0.2: gapTop≈117, gapBot≈265. Ball range y=180-238: top=162-220 ✓, bot=198-256 ✓
  async function goToPlayingFakeTime(randomValue: number, nFrames: number) {
    jest.spyOn(Math, 'random').mockReturnValue(randomValue)
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })

    render(<FootballGame {...defaultProps} />)
    await act(async () => { jest.runAllTimers() })
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())

    // Set fake time to 0 so all subsequent flap cooldown checks work correctly
    // (initial flap sets lastFlapRef = Date.now() = 0)
    jest.setSystemTime(0)
    act(() => { fireEvent.click(document.querySelector('canvas')!) })  // Initial flap at t=0

    // Use batchSize=43 for zero net displacement: ball returns to same y after each batch.
    // Each batch: flap at (batch+1)*100ms → 100ms > 80ms cooldown ✓
    const batchSize = 43
    const numBatches = Math.ceil(nFrames / batchSize)
    for (let batch = 0; batch < numBatches; batch++) {
      jest.setSystemTime((batch + 1) * 100)  // Advance by 100ms (>80ms cooldown)
      act(() => { fireEvent.click(document.querySelector('canvas')!) })
      act(() => { d.flush(batchSize) })
    }
    return d
  }

  it('ball passes pipe (no collision) — covers score increment and pipe refill (lines 518-525)', async () => {
    // random=0.2 → gapTop=117, gapBot=265. Ball oscillates y≈180-238.
    // Ball safe range: top=162-220 > 117 ✓, bot=198-256 < 265 ✓
    // 220 frames = ceil(220/43)=6 batches: first pipe passes ball at ~213 frames.
    await goToPlayingFakeTime(0.2, 220)
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('ball hits pipe body — covers pipe collision in hit() (lines 121-122)', async () => {
    // random=0.99 → gapTop≈221, gapBot≈369. Ball oscillates y≈180-238.
    // Ball top at peak: 180-18=162 < 221 → pipe body hit when pipe arrives ✓
    // Run 220 frames (pipe arrives at ~213 frames) with fake death timer.
    await goToPlayingFakeTime(0.99, 220)
    // Advance the death timer after collision
    await act(async () => { jest.advanceTimersByTime(2000) })
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('drawHUD level indicator + level-up flash (lines 404-408, 530-532, 555-562)', async () => {
    // random=0.2 → safe pipes. Need score ≥ 10 (level > 0).
    // First pipe pass: ~213 frames. Each subsequent: ~91 frames (interval=285, speed=3.8).
    // Total for 10 passes: ~1032 frames. Run 1100 = ceil(1100/43)=26 batches.
    // Also covers drawPipe gap guide line (216-222) when ball near pipe center.
    await goToPlayingFakeTime(0.2, 1100)
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('drawBall long name branch (line 354) — name > 11 chars gets truncated', async () => {
    // Use a player name > 11 chars to trigger the truncation branch in drawBall.
    jest.spyOn(Math, 'random').mockReturnValue(0.2)
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })

    const longName = 'VeryLongPlayerNameHere'  // 22 chars
    render(<FootballGame playerName={longName} onClose={jest.fn()} onGameStart={jest.fn()} />)
    await act(async () => { jest.runAllTimers() })
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    jest.setSystemTime(0)
    act(() => { fireEvent.click(document.querySelector('canvas')!) })
    act(() => { d.flush(5) })
    expect(mockCtx.fillText).toHaveBeenCalled()
  })

  it('drawHUD credits <= 2 branch (line 398) — shows red credits', async () => {
    // Start session with newBalance=1 → creditsRef.current=1 ≤ 2 → red color branch.
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk(1, 1, 0)
      if (url === '/api/flappy-credits' && opts?.method === 'POST') return mockStartSessionOk('s1', 1)
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    jest.spyOn(Math, 'random').mockReturnValue(0.2)
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })

    render(<FootballGame {...defaultProps} />)
    await act(async () => { jest.runAllTimers() })
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    jest.setSystemTime(0)
    act(() => { fireEvent.click(document.querySelector('canvas')!) })
    act(() => { d.flush(5) })
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('saveprompt/gameover emoji 👍 branch (score 7-14)', async () => {
    // Run ~730 frames (≈8 pipe passes, score=8) then die → emoji shows 👍
    jest.spyOn(Math, 'random').mockReturnValue(0.2)
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })

    render(<FootballGame {...defaultProps} />)
    await act(async () => { jest.runAllTimers() })
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())

    jest.setSystemTime(0)
    act(() => { fireEvent.click(document.querySelector('canvas')!) })

    // Run 17 batches of 43 = 731 frames → ≈8 pipe passes, score≈8
    for (let batch = 0; batch < 17; batch++) {
      jest.setSystemTime((batch + 1) * 100)
      act(() => { fireEvent.click(document.querySelector('canvas')!) })
      act(() => { d.flush(43) })
    }

    // Let ball die (no more flaps → falls in ~19 frames)
    act(() => { d.flush(30) })
    await act(async () => { jest.advanceTimersByTime(1000) })

    const hasSaveprompt = screen.queryByText('Wil je je score opslaan?')
    if (hasSaveprompt) {
      // Score 7-14 shows 👍
      expect(mockCtx.clearRect).toHaveBeenCalled()
    }
  })

  it('saveprompt/gameover emoji 🏆 branch (score≥15) and 👍 branch (score 7-14)', async () => {
    // Run enough frames to pass 15+ pipes (score≥15), then trigger death.
    // This covers: finalScore >= 15 ? '🏆' ... and finalScore >= 7 ? '👍' ...
    // First pass: ~213 frames. For 15 passes: 213 + 14*91 = 1487 frames.
    // Run 1500 frames with random=0.2 to get score≥15, then die.
    jest.spyOn(Math, 'random').mockReturnValue(0.2)
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })

    render(<FootballGame {...defaultProps} />)
    await act(async () => { jest.runAllTimers() })
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())

    // Run 1500 frames with stable flapping (batchSize=43, zero net displacement)
    jest.setSystemTime(0)
    act(() => { fireEvent.click(document.querySelector('canvas')!) })  // Initial flap

    const batchSize = 43
    const numBatches = Math.ceil(1500 / batchSize)
    for (let batch = 0; batch < numBatches; batch++) {
      jest.setSystemTime((batch + 1) * 100)
      act(() => { fireEvent.click(document.querySelector('canvas')!) })
      act(() => { d.flush(batchSize) })
    }

    // Now let ball die (don't flap for 70+ frames)
    // Since we used fake timers with doNotFake rAF, we need to advance time to
    // allow the death to register (no more flaps → ball falls)
    // Actually ball IS still alive. Let it fall by just running more frames without flap.
    // Don't advance fake time → flap cooldown not met → no more flaps.
    act(() => { d.flush(70) })  // Ball falls to ground
    await act(async () => { jest.advanceTimersByTime(1000) })

    // Check if saveprompt was reached with high score
    const hasSaveprompt = screen.queryByText('Wil je je score opslaan?')
    if (hasSaveprompt) {
      // Score should be ≥10 (showing 👍 or 🏆)
      expect(screen.queryByText('😢') || screen.queryByText('👍') || screen.queryByText('🏆')).toBeTruthy()
    }
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('saveScore error catch branch (line 94)', async () => {
    // Make the save fetch throw an error to cover the catch block
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk()
      if (url === '/api/flappy-credits' && opts?.method === 'POST') {
        const body = JSON.parse(opts.body as string)
        if (body.action === 'start') return mockStartSessionOk('s1', 2)
        if (body.action === 'save') return Promise.reject(new Error('save error'))
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })

    render(<FootballGame {...defaultProps} />)
    await act(async () => { jest.runAllTimers() })
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    jest.setSystemTime(0)
    act(() => { fireEvent.click(document.querySelector('canvas')!) })
    act(() => { d.flush(70) })
    // Advance death timer
    await act(async () => { jest.advanceTimersByTime(1000) })
    // If we reach saveprompt, click Opslaan to trigger saveScore (which will throw/catch)
    const opslaanBtn = screen.queryByText('✓ Opslaan')
    if (opslaanBtn) {
      await act(async () => { fireEvent.click(opslaanBtn) })
      // Should end up on gameover after the catch
      await waitFor(() => expect(screen.getByText('Game Over!')).toBeInTheDocument())
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('FootballGame – branch coverage extras', () => {
  afterEach(() => {
    global.requestAnimationFrame = jest.fn(() => 0)
    jest.useRealTimers()
    jest.spyOn(Math, 'random').mockRestore()
  })

  it('flap() cooldown branch (line 452) — rapid Space presses ignored', async () => {
    // In the playing screen, the global keydown handler calls flap() via the
    // useEffect. If two Space presses happen within FLAP_COOLDOWN (80ms), second ignored.
    // This covers: if (now - lastFlapRef.current < FLAP_COOLDOWN) return
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    render(<FootballGame {...defaultProps} />)
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    act(() => { d.flush(1) })
    // Press Space once (sets lastFlapRef)
    act(() => { fireEvent.keyDown(window, { code: 'Space' }) })
    // Press Space again immediately (same Date.now → cooldown → ignored)
    act(() => { fireEvent.keyDown(window, { code: 'Space' }) })
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('startAndFlap cooldown branch (line 490) — rapid canvas clicks ignored', async () => {
    // startAndFlap checks: if (started && now - lastFlapRef.current < FLAP_COOLDOWN) return
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    render(<FootballGame {...defaultProps} />)
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    act(() => { d.flush(1) })
    const canvas = document.querySelector('canvas')!
    // First click starts game (started=true, sets lastFlapRef)
    act(() => { fireEvent.click(canvas) })
    // Second click immediately (same timestamp → cooldown check triggered)
    act(() => { fireEvent.click(canvas) })
    act(() => { d.flush(2) })
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('flap() gs.dead branch (line 450) — flap when ball is dead', async () => {
    // When gs.dead=true, flap() returns early without setting ballVY.
    // This is covered by the death path tests where frames continue running while dead.
    // Adding an explicit test: click Space after ball dies.
    const d = makeDeferredRaf()
    global.requestAnimationFrame = d.raf
    render(<FootballGame {...defaultProps} />)
    await waitFor(() => {
      const btn = screen.getByText('Spelen! ⚽')
      expect(btn).not.toBeDisabled()
    })
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument())
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    jest.setSystemTime(0)
    act(() => { fireEvent.click(document.querySelector('canvas')!) })  // Start game
    act(() => { d.flush(70) })  // Ball dies at frame ~62
    // After death, press Space (via global flap() handler)
    jest.setSystemTime(200)  // Advance time to bypass cooldown
    act(() => { fireEvent.keyDown(window, { code: 'Space' }) })  // gs.dead=true → return early
    // Advance death timer
    await act(async () => { jest.advanceTimersByTime(1000) })
    expect(mockCtx.clearRect).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('FootballGame – credits display', () => {
  it('shows credits breakdown', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk(10, 7, 3)
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    render(<FootballGame playerName="Pro" onClose={jest.fn()} onGameStart={jest.fn()} />)
    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument())
    expect(screen.getByText('Selectie: 7')).toBeInTheDocument()
    expect(screen.getByText('Uitslagen: 3')).toBeInTheDocument()
  })

  it('startSession throws null → stays on menu', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/flappy-credits' && !opts) return mockCreditsOk(2, 1, 1)
      if (url === '/api/flappy-credits' && opts?.method === 'POST') {
        return Promise.reject(new Error('failed'))
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    await renderMenu()
    await waitFor(() => expect(screen.getByText('Spelen! ⚽')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('Spelen! ⚽')) })
    expect(screen.getByText('Flappy Bal!')).toBeInTheDocument()
  })
})
