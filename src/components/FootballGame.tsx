"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Canvas ───────────────────────────────────────────────────
const W = 800
const H = 440
const CEIL = 36       // HUD height
const GROUND_Y = H - 40

// ─── Physics / geometry ───────────────────────────────────────
const BALL_R = 18
const GRAVITY = 0.25
const FLAP_V = -5.5     // direct velocity set per jump (original Flappy Bird style)
const PIPE_W = 62
const PIPE_CAP = 20
const PIPE_CAP_EXTRA = 8
const PIPE_INTERVAL = 285
const BALL_X = 130

const SPEED = 3.8
const GAP = 148
const FLAP_COOLDOWN = 80   // ms between flaps (very responsive)

type Screen = 'menu' | 'playing' | 'saveprompt' | 'gameover' | 'scoreboard'

interface Pipe { x: number; gapTop: number; gapBot: number; passed: boolean }

interface GS {
  ballY: number
  ballVY: number
  pipes: Pipe[]
  score: number
  tick: number
  dead: boolean
}

export interface ScoreEntry {
  id?: number
  myName: string
  score: number
  played_at: string
}

// ─── API helpers ──────────────────────────────────────────────
async function fetchScores(): Promise<ScoreEntry[]> {
  const res = await fetch('/api/flappy-scores')
  if (!res.ok) return []
  const data = await res.json()
  return (data as Array<{ id: number; score: number; played_at: string; display_name: string | null }>).map((r) => ({
    id: r.id,
    myName: r.display_name ?? '???',
    score: r.score,
    played_at: r.played_at,
  }))
}

async function fetchCredits(): Promise<{ available: number; preCredits: number; wkCredits: number }> {
  try {
    const res = await fetch('/api/flappy-credits')
    if (!res.ok) return { available: 0, preCredits: 0, wkCredits: 0 }
    return res.json()
  } catch { return { available: 0, preCredits: 0, wkCredits: 0 } }
}

async function spendCredit(score: number, save: boolean): Promise<number> {
  try {
    const res = await fetch('/api/flappy-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, save }),
    })
    const data = await res.json()
    return data.newBalance ?? 0
  } catch { return 0 }
}

// ─── Helpers ──────────────────────────────────────────────────
function mkPipe(x: number, gap: number): Pipe {
  const gapTop = CEIL + 55 + Math.random() * (GROUND_Y - CEIL - 55 - gap - 30)
  return { x, gapTop, gapBot: gapTop + gap, passed: false }
}

function initGS(): GS {
  return {
    ballY: (H + CEIL) / 2,
    ballVY: 0,
    pipes: [
      mkPipe(W + 60, GAP),
      mkPipe(W + 60 + PIPE_INTERVAL, GAP),
      mkPipe(W + 60 + PIPE_INTERVAL * 2, GAP),
    ],
    score: 0, tick: 0, dead: false,
  }
}

function hit(ballY: number, pipes: Pipe[]): boolean {
  if (ballY - BALL_R < CEIL || ballY + BALL_R > GROUND_Y) return true
  for (const p of pipes) {
    if (BALL_X + BALL_R - 4 > p.x && BALL_X - BALL_R + 4 < p.x + PIPE_W) {
      if (ballY - BALL_R < p.gapTop || ballY + BALL_R > p.gapBot) return true
    }
  }
  return false
}

// ─── Draw background ──────────────────────────────────────────
function drawBG(ctx: CanvasRenderingContext2D, tick: number) {
  const sky = ctx.createLinearGradient(0, CEIL, 0, GROUND_Y)
  sky.addColorStop(0, '#08172e')
  sky.addColorStop(0.65, '#163966')
  sky.addColorStop(1, '#1b508a')
  ctx.fillStyle = sky
  ctx.fillRect(0, CEIL, W, GROUND_Y - CEIL)

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  const sx = [55,115,190,305,435,555,645,745,385,90,470,720]
  const sy = [50,40,65,48,58,42,68,50,56,75,82,62]
  for (let i = 0; i < sx.length; i++) {
    const x = ((sx[i] - tick * 0.28) % W + W) % W
    ctx.beginPath(); ctx.arc(x, sy[i], 1.3, 0, Math.PI * 2); ctx.fill()
  }

  // Stadium glow lights
  for (const lx of [70, W - 70]) {
    const lg = ctx.createRadialGradient(lx, CEIL + 16, 0, lx, CEIL + 16, 140)
    lg.addColorStop(0, 'rgba(255,245,180,0.2)')
    lg.addColorStop(1, 'rgba(255,245,180,0)')
    ctx.fillStyle = lg
    ctx.fillRect(lx - 140, CEIL, 280, 200)
  }

  // Crowd
  ctx.fillStyle = '#0c2244'
  for (let cx = 14; cx < W; cx += 25) {
    const ox = ((cx - tick * 0.45) % W + W) % W
    ctx.beginPath(); ctx.arc(ox, GROUND_Y - 13, 8.5, Math.PI, 0); ctx.fill()
    ctx.fillRect(ox - 8.5, GROUND_Y - 13, 17, 9)
  }

  // Pitch stripes
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1f6122' : '#236b26'
    ctx.fillRect(i * (W / 10), GROUND_Y, W / 10, 40)
  }

  // White touchline
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke()

  // Dashed line on pitch
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 2; ctx.setLineDash([18, 26])
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 17); ctx.lineTo(W, GROUND_Y + 17); ctx.stroke()
  ctx.setLineDash([])
}

// ─── Draw pipes ───────────────────────────────────────────────
function drawPipe(ctx: CanvasRenderingContext2D, p: Pipe) {
  const { x, gapTop, gapBot } = p

  const makeGrad = (y1: number, y2: number) => {
    const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0)
    g.addColorStop(0, '#145214')
    g.addColorStop(0.28, '#2ebd2e')
    g.addColorStop(0.72, '#228B22')
    g.addColorStop(1, '#0e3d0e')
    return g
  }

  // Top pipe body
  ctx.fillStyle = makeGrad(CEIL, gapTop)
  ctx.fillRect(x, CEIL, PIPE_W, Math.max(0, gapTop - CEIL - PIPE_CAP))

  // Top cap
  ctx.fillStyle = '#0e3d0e'
  ctx.fillRect(x - PIPE_CAP_EXTRA, gapTop - PIPE_CAP, PIPE_W + PIPE_CAP_EXTRA * 2, PIPE_CAP)
  // Cap highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(x - PIPE_CAP_EXTRA + 4, gapTop - PIPE_CAP + 3, 7, PIPE_CAP - 6)

  // Bottom pipe body
  ctx.fillStyle = makeGrad(gapBot, GROUND_Y)
  ctx.fillRect(x, gapBot + PIPE_CAP, PIPE_W, Math.max(0, GROUND_Y - gapBot - PIPE_CAP))

  // Bottom cap
  ctx.fillStyle = '#0e3d0e'
  ctx.fillRect(x - PIPE_CAP_EXTRA, gapBot, PIPE_W + PIPE_CAP_EXTRA * 2, PIPE_CAP)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(x - PIPE_CAP_EXTRA + 4, gapBot + 3, 7, PIPE_CAP - 6)

  // Subtle gap guide line
  if (Math.abs(x + PIPE_W / 2 - BALL_X) < 100) {
    ctx.strokeStyle = 'rgba(255,255,100,0.12)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x + PIPE_W / 2, gapTop + PIPE_CAP)
    ctx.lineTo(x + PIPE_W / 2, gapBot)
    ctx.stroke()
  }
}

// ─── Draw ball ────────────────────────────────────────────────
function drawBall(ctx: CanvasRenderingContext2D, y: number, vy: number, name: string, dead: boolean) {
  const tilt = dead ? 1.2 : Math.max(-0.45, Math.min(0.45, vy * 0.055))

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(BALL_X + 5, y + BALL_R + 5, BALL_R * 0.85, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(BALL_X, y)
  ctx.rotate(tilt)

  // Ball body
  const bg = ctx.createRadialGradient(-BALL_R * 0.32, -BALL_R * 0.32, 1.5, 0, 0, BALL_R)
  bg.addColorStop(0, '#ffffff')
  bg.addColorStop(0.45, '#f2f2f2')
  bg.addColorStop(1, '#c0c0c0')
  ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2)
  ctx.fillStyle = bg; ctx.fill()
  ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5; ctx.stroke()

  // Football patches
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5 - Math.PI / 2
    ctx.beginPath()
    ctx.arc(Math.cos(a) * 10.5, Math.sin(a) * 10.5, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Face
  // White of eyes
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.ellipse(-5.5, -3, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(5.5, -3, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill()

  if (dead) {
    // X eyes
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    for (const [ex, ey] of [[-5.5, -3], [5.5, -3]] as [number,number][]) {
      ctx.beginPath(); ctx.moveTo(ex-3, ey-3); ctx.lineTo(ex+3, ey+3); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(ex+3, ey-3); ctx.lineTo(ex-3, ey+3); ctx.stroke()
    }
    // Sad mouth
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.arc(0, 8, 5, Math.PI + 0.3, -0.3); ctx.stroke()
  } else {
    // Iris
    ctx.fillStyle = '#1565c0'
    ctx.beginPath(); ctx.ellipse(-5.5, -2.5, 2.5, 3.2, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(5.5, -2.5, 2.5, 3.2, 0, 0, Math.PI * 2); ctx.fill()
    // Pupil
    ctx.fillStyle = '#000'
    ctx.beginPath(); ctx.arc(-5, -2, 1.4, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(6, -2, 1.4, 0, Math.PI * 2); ctx.fill()
    // Gleam
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(-4, -3.5, 0.9, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(7, -3.5, 0.9, 0, Math.PI * 2); ctx.fill()

    // Expression mouth
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'
    if (vy < -3) {
      ctx.beginPath(); ctx.arc(0, 5, 5, 0.25, Math.PI - 0.25); ctx.stroke()
    } else if (vy > 4) {
      ctx.beginPath(); ctx.arc(0, 9, 5, Math.PI + 0.25, -0.25); ctx.stroke()
    } else {
      ctx.beginPath(); ctx.moveTo(-4, 7); ctx.lineTo(4, 7); ctx.stroke()
    }
  }

  ctx.restore()

  // Name tag
  ctx.font = 'bold 11px Arial'
  ctx.textAlign = 'center'
  const label = name.length > 11 ? name.slice(0, 10) + '…' : name
  const tw = ctx.measureText(label).width + 14
  const tagY = y - BALL_R - 22
  ctx.fillStyle = 'rgba(255,98,0,0.92)'
  ctx.beginPath()
  const rx = BALL_X - tw / 2, rr = 4
  ctx.moveTo(rx + rr, tagY)
  ctx.lineTo(rx + tw - rr, tagY)
  ctx.arcTo(rx + tw, tagY, rx + tw, tagY + 17, rr)
  ctx.arcTo(rx + tw, tagY + 17, rx, tagY + 17, rr)
  ctx.arcTo(rx, tagY + 17, rx, tagY, rr)
  ctx.arcTo(rx, tagY, rx + tw, tagY, rr)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(label, BALL_X, tagY + 13)
}

// ─── Draw HUD ─────────────────────────────────────────────────
function drawHUD(ctx: CanvasRenderingContext2D, score: number, name: string, credits: number) {
  const g = ctx.createLinearGradient(0, 0, 0, CEIL)
  g.addColorStop(0, 'rgba(0,0,0,0.92)')
  g.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, CEIL)

  ctx.strokeStyle = 'rgba(255,98,0,0.35)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, CEIL); ctx.lineTo(W, CEIL); ctx.stroke()

  // Accent strips
  ctx.fillStyle = '#FF6200'; ctx.fillRect(0, 0, 5, CEIL)
  ctx.fillStyle = '#003082'; ctx.fillRect(W - 5, 0, 5, CEIL)

  ctx.textBaseline = 'middle'
  const midY = CEIL / 2

  ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'
  ctx.fillStyle = '#FF6200'
  ctx.fillText(name.slice(0, 16), 16, midY)

  ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  ctx.fillText(`⚽ ${score}`, W / 2, midY)

  ctx.font = 'bold 12px Arial'; ctx.textAlign = 'right'
  ctx.fillStyle = credits <= 2 ? '#ff6666' : '#ffa040'
  ctx.fillText(`⚡ ${credits}`, W - 16, midY)
  ctx.textBaseline = 'alphabetic'
}

function drawGetReady(ctx: CanvasRenderingContext2D) {
  ctx.font = 'bold 17px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.fillText('Druk SPATIE of klik om te starten', W / 2, H / 2 + 68)
  ctx.textBaseline = 'alphabetic'
}

// ─── Component ────────────────────────────────────────────────
export default function FootballGame({
  playerName,
  onClose,
}: {
  playerName: string
  opponents?: string[]
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gsRef = useRef<GS | null>(null)
  const rafRef = useRef(0)
  const lastFlapRef = useRef(0)
  const creditsRef = useRef(0)

  const [screen, setScreen] = useState<Screen>('menu')
  const [finalScore, setFinalScore] = useState(0)
  const [history, setHistory] = useState<ScoreEntry[]>([])
  const [scoresLoading, setScoresLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [creditBreakdown, setCreditBreakdown] = useState({ preCredits: 0, wkCredits: 0 })

  const flap = useCallback(() => {
    const gs = gsRef.current
    if (!gs || gs.dead) return
    const now = Date.now()
    if (now - lastFlapRef.current < FLAP_COOLDOWN) return
    lastFlapRef.current = now
    gs.ballVY = FLAP_V
  }, [])

  // Fetch credits on mount
  useEffect(() => {
    fetchCredits().then(({ available, preCredits, wkCredits }) => {
      setCredits(available)
      creditsRef.current = available
      setCreditBreakdown({ preCredits, wkCredits })
    })
  }, [])

  // Keep ref in sync for the RAF loop
  useEffect(() => { creditsRef.current = credits ?? 0 }, [credits])

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); flap() }
    }
    window.addEventListener('keydown', dn)
    return () => window.removeEventListener('keydown', dn)
  }, [flap])

  useEffect(() => {
    if (screen !== 'playing') return

    gsRef.current = initGS()
    lastFlapRef.current = 0
    let started = false
    let deathTimer: ReturnType<typeof setTimeout> | null = null

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    function startAndFlap() {
      const now = Date.now()
      if (started && now - lastFlapRef.current < FLAP_COOLDOWN) return
      lastFlapRef.current = now
      started = true
      if (gsRef.current && !gsRef.current.dead) {
        gsRef.current.ballVY = FLAP_V
      }
    }

    const clickHandler = () => startAndFlap()
    const keyHandler = (e: KeyboardEvent) => { if (e.code === 'Space') startAndFlap() }
    canvas.addEventListener('click', clickHandler)
    window.addEventListener('keydown', keyHandler)

    function loop() {
      const gs = gsRef.current!

      if (started && !gs.dead) {
        // Physics
        gs.ballVY = Math.min(gs.ballVY + GRAVITY, 13)
        gs.ballY += gs.ballVY

        // Pipes
        for (const p of gs.pipes) p.x -= SPEED
        const maxX = Math.max(...gs.pipes.map(p => p.x))
        gs.pipes = gs.pipes.filter(p => p.x + PIPE_W > -10)
        while (gs.pipes.length < 3) {
          gs.pipes.push(mkPipe(maxX + PIPE_INTERVAL, GAP))
        }

        // Score
        for (const p of gs.pipes) {
          if (!p.passed && p.x + PIPE_W < BALL_X - BALL_R) {
            p.passed = true; gs.score++
          }
        }

        // Collision
        if (hit(gs.ballY, gs.pipes)) {
          gs.dead = true
          setFinalScore(gs.score)
          deathTimer = setTimeout(() => setScreen('saveprompt'), 950)
        }

        gs.tick++
      }

      // Render
      ctx.clearRect(0, 0, W, H)
      drawBG(ctx, gs.tick)
      for (const p of gs.pipes) drawPipe(ctx, p)
      drawBall(ctx, gs.ballY, started ? gs.ballVY : 0, playerName, gs.dead)
      drawHUD(ctx, gs.score, playerName, creditsRef.current)
      if (!started) drawGetReady(ctx)
      if (gs.dead) {
        ctx.fillStyle = 'rgba(200,0,0,0.35)'
        ctx.fillRect(0, 0, W, H)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('click', clickHandler)
      window.removeEventListener('keydown', keyHandler)
      if (deathTimer) clearTimeout(deathTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative bg-gray-950 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10"
        style={{ width: Math.min(W, typeof window !== 'undefined' ? window.innerWidth - 16 : W) }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white flex items-center justify-center text-lg leading-none transition-colors"
        >×</button>

        {screen === 'playing' && (
          <canvas
            ref={canvasRef} width={W} height={H}
            className="block w-full cursor-pointer select-none"
            style={{ aspectRatio: `${W}/${H}` }}
          />
        )}

        {screen === 'menu' && (
          <div className="flex flex-col items-center gap-5 px-8 py-10 text-white">
            <div className="text-6xl animate-bounce">⚽</div>
            <h2 className="text-3xl font-black tracking-tight">Flappy Bal!</h2>
            <p className="text-white/60 text-sm text-center max-w-xs">
              Jij speelt als <span className="text-orange-400 font-bold">{playerName}</span>.
              Druk <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white/90">SPATIE</kbd> of klik om de bal omhoog te sturen. Ontwijkt de palen!
            </p>

            {/* Credits display */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center w-full max-w-xs">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">⚡</span>
                {credits === null ? (
                  <span className="text-white/40 animate-pulse">Laden…</span>
                ) : (
                  <span className={`text-3xl font-black ${credits === 0 ? 'text-red-400' : 'text-orange-400'}`}>{credits}</span>
                )}
                <span className="text-white/50 text-sm">credits</span>
              </div>
              <div className="flex justify-center gap-4 text-xs text-white/35 mt-1">
                <span>Selectie: {creditBreakdown.preCredits}</span>
                <span>·</span>
                <span>Uitslagen: {creditBreakdown.wkCredits}</span>
              </div>
              {credits === 0 && (
                <p className="text-red-400/80 text-xs mt-2">Voorspel juist om credits te verdienen</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                disabled={credits === null || credits <= 0}
                onClick={() => setScreen('playing')}
                className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-10 py-3.5 rounded-xl text-lg shadow-lg shadow-orange-900/40 transition-colors"
              >
                {credits === 0 ? '⚡ Geen credits' : 'Spelen! ⚽'}
              </button>
              <button onClick={async () => { setScoresLoading(true); setScreen('scoreboard'); const h = await fetchScores(); setHistory(h); setScoresLoading(false) }}
                className="bg-white/10 hover:bg-white/20 text-white/80 font-semibold px-6 py-3.5 rounded-xl transition-colors"
              >
                🏆 Scores
              </button>
            </div>
          </div>
        )}

        {screen === 'saveprompt' && (
          <div className="flex flex-col items-center gap-5 px-8 py-10 text-white">
            <div className="text-6xl">{finalScore >= 15 ? '🏆' : finalScore >= 7 ? '👍' : '😢'}</div>
            <h2 className="text-2xl font-black">Game Over!</h2>
            <div className="text-center">
              <div className="text-white/50 text-sm mb-1">Score</div>
              <div className="text-7xl font-black text-orange-400">{finalScore}</div>
            </div>
            <div className="bg-white/5 rounded-xl px-5 py-2 text-center">
              <p className="text-white/60 text-sm">Wil je je score opslaan?</p>
              <p className="text-orange-400/70 text-xs mt-0.5">⚡ 1 credit wordt verbruikt</p>
            </div>
            <div className="flex gap-3">
              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true)
                  const newBal = await spendCredit(finalScore, true)
                  setCredits(newBal)
                  setSaving(false)
                  setScreen('gameover')
                }}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black px-8 py-3 rounded-xl transition-colors"
              >
                {saving ? 'Bezig…' : '✓ Opslaan'}
              </button>
              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true)
                  const newBal = await spendCredit(finalScore, false)
                  setCredits(newBal)
                  setSaving(false)
                  setScreen('gameover')
                }}
                className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white/60 font-semibold px-8 py-3 rounded-xl transition-colors"
              >
                ✗ Niet opslaan
              </button>
            </div>
          </div>
        )}

        {screen === 'gameover' && (
          <div className="flex flex-col items-center gap-5 px-8 py-10 text-white">
            <div className="text-6xl">{finalScore >= 15 ? '🏆' : finalScore >= 7 ? '👍' : '😢'}</div>
            <h2 className="text-2xl font-black">Game Over!</h2>
            <div className="text-center">
              <div className="text-white/50 text-sm mb-1">Score</div>
              <div className="text-7xl font-black text-orange-400">{finalScore}</div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setScreen('menu')} className="bg-orange-500 hover:bg-orange-400 text-white font-black px-8 py-3 rounded-xl transition-colors">Opnieuw</button>
              <button onClick={async () => { setScoresLoading(true); setScreen('scoreboard'); const h = await fetchScores(); setHistory(h); setScoresLoading(false) }} className="bg-white/10 hover:bg-white/20 text-white/80 font-semibold px-6 py-3 rounded-xl transition-colors">🏆 Scores</button>
              <button onClick={onClose} className="bg-white/5 hover:bg-white/10 text-white/40 font-semibold px-5 py-3 rounded-xl transition-colors">Sluiten</button>
            </div>
          </div>
        )}

        {screen === 'scoreboard' && (
          <div className="flex flex-col px-6 py-8 text-white" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 className="text-xl font-black text-center mb-5">🏆 Highscores</h2>
            {scoresLoading ? (
              <p className="text-white/40 text-center py-8 animate-pulse">Laden…</p>
            ) : history.length === 0 ? (
              <p className="text-white/40 text-center py-8">Nog geen scores.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-left border-b border-white/10">
                    <th className="pb-2 font-medium pr-2">#</th>
                    <th className="pb-2 font-medium pr-3">Naam</th>
                    <th className="pb-2 font-medium text-center px-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((e, i) => (
                    <tr key={e.id ?? i} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${e.myName === playerName ? 'bg-orange-500/10' : ''}`}>
                      <td className="py-2 text-white/30 pr-2 font-bold">{i + 1}</td>
                      <td className={`py-2 font-medium pr-3 ${e.myName === playerName ? 'text-orange-400' : 'text-white/80'}`}>{e.myName}</td>
                      <td className="py-2 text-center px-2 font-black text-xl text-white">{e.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => setScreen('menu')}
              className="mt-6 bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-3 rounded-xl transition-colors mx-auto block"
            >Terug</button>
          </div>
        )}
      </div>
    </div>
  )
}
