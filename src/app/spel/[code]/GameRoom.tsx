'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'
import Link from 'next/link'

// ── Canvas constants ────────────────────────────────────────────────────────
const W = 800, H = 500
const PR = 14        // player radius
const BR = 10        // ball radius
const GY1 = 185      // goal top y
const GY2 = 315      // goal bottom y
const GD = 28        // goal depth (net drawn this many px inside field edge)
const ACEL = 0.48
const PFRIC = 0.84
const BFRIC = 0.982
const MAXSPD = 5
const KICK = 11
const KRANGE = 40

// ── Types ────────────────────────────────────────────────────────────────────
type Team = 'blue' | 'red'
type Phase = 'lobby' | 'countdown' | 'playing' | 'goal_pause' | 'finished'

interface PP { x: number; y: number; vx: number; vy: number }
interface Keys { up: boolean; down: boolean; left: boolean; right: boolean; space: boolean }

interface LobbyPlayer {
  sessionId: string
  displayName: string
  team: Team
  playerIndex: number
}

interface GState {
  players: Record<string, PP>
  ball: { x: number; y: number; vx: number; vy: number }
  score: { blue: number; red: number }
  timeLeft: number
  phase: Phase
  lastGoal?: Team
}

interface JoinInfo {
  team: Team
  playerIndex: number
  isHost: boolean
  displayName: string
  room: { teamSize: number; maxGoals: number; maxMinutes: number }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getSessionId() {
  let id = localStorage.getItem('spel_session_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    localStorage.setItem('spel_session_id', id)
  }
  return id
}

function startPos(team: Team, index: number, teamSize: number): { x: number; y: number } {
  const bx = W * 0.25, rx = W * 0.75
  const y1 = [H / 2, H * 0.37, H * 0.28][teamSize - 1]
  const step = teamSize === 1 ? 0 : teamSize === 2 ? H * 0.26 : H * 0.22
  return { x: team === 'blue' ? bx : rx, y: y1 + index * step }
}

function makeState(players: LobbyPlayer[], teamSize: number, maxMinutes: number): GState {
  const pp: Record<string, PP> = {}
  for (const p of players) {
    const { x, y } = startPos(p.team, p.playerIndex, teamSize)
    pp[p.sessionId] = { x, y, vx: 0, vy: 0 }
  }
  return {
    players: pp,
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
    score: { blue: 0, red: 0 },
    timeLeft: maxMinutes * 60,
    phase: 'countdown',
  }
}

function resetAfterGoal(state: GState, players: LobbyPlayer[], teamSize: number) {
  for (const p of players) {
    const { x, y } = startPos(p.team, p.playerIndex, teamSize)
    const pp = state.players[p.sessionId]
    if (pp) { pp.x = x; pp.y = y; pp.vx = 0; pp.vy = 0 }
  }
  state.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 }
}

// ── Physics ───────────────────────────────────────────────────────────────────
function step(state: GState, inputs: Record<string, Keys>, players: LobbyPlayer[], maxGoals: number) {
  if (state.phase !== 'playing') return

  // Players
  for (const p of players) {
    const pp = state.players[p.sessionId]
    if (!pp) continue
    const k = inputs[p.sessionId] ?? {}

    if (k.up)    pp.vy -= ACEL
    if (k.down)  pp.vy += ACEL
    if (k.left)  pp.vx -= ACEL
    if (k.right) pp.vx += ACEL

    const spd = Math.hypot(pp.vx, pp.vy)
    if (spd > MAXSPD) { pp.vx = pp.vx / spd * MAXSPD; pp.vy = pp.vy / spd * MAXSPD }

    pp.vx *= PFRIC; pp.vy *= PFRIC
    pp.x += pp.vx; pp.y += pp.vy

    const L = 30 + PR, R = W - 30 - PR, T = 20 + PR, B = H - 20 - PR
    if (pp.x < L) { pp.x = L; pp.vx = Math.abs(pp.vx) * 0.5 }
    if (pp.x > R) { pp.x = R; pp.vx = -Math.abs(pp.vx) * 0.5 }
    if (pp.y < T) { pp.y = T; pp.vy = Math.abs(pp.vy) * 0.5 }
    if (pp.y > B) { pp.y = B; pp.vy = -Math.abs(pp.vy) * 0.5 }

    // Kick
    if (k.space) {
      const dx = state.ball.x - pp.x, dy = state.ball.y - pp.y
      const d = Math.hypot(dx, dy)
      if (d < KRANGE && d > 0) {
        state.ball.vx += dx / d * KICK
        state.ball.vy += dy / d * KICK
      }
    }
  }

  // Player–player collisions
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = state.players[players[i].sessionId]
      const b = state.players[players[j].sessionId]
      if (!a || !b) continue
      const dx = b.x - a.x, dy = b.y - a.y
      const d = Math.hypot(dx, dy)
      const min = PR * 2
      if (d < min && d > 0) {
        const nx = dx / d, ny = dy / d, ov = (min - d) / 2
        a.x -= nx * ov; a.y -= ny * ov
        b.x += nx * ov; b.y += ny * ov
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
        if (rel > 0) {
          a.vx -= rel * nx * 0.7; a.vy -= rel * ny * 0.7
          b.vx += rel * nx * 0.7; b.vy += rel * ny * 0.7
        }
      }
    }
  }

  // Ball
  const bl = state.ball
  bl.vx *= BFRIC; bl.vy *= BFRIC
  bl.x += bl.vx; bl.y += bl.vy

  // Top / bottom
  if (bl.y - BR < 20) { bl.y = 20 + BR; bl.vy = Math.abs(bl.vy) * 0.8 }
  if (bl.y + BR > H - 20) { bl.y = H - 20 - BR; bl.vy = -Math.abs(bl.vy) * 0.8 }

  // Left wall / goal (red scores when ball enters left goal)
  if (bl.x - BR < 30) {
    if (bl.y > GY1 && bl.y < GY2) {
      // Ball past the goal line
      if (bl.x < 0) {
        state.score.red++
        state.phase = state.score.red >= maxGoals ? 'finished' : 'goal_pause'
        state.lastGoal = 'red'
        return
      }
    } else {
      bl.x = 30 + BR; bl.vx = Math.abs(bl.vx) * 0.8
    }
  }

  // Right wall / goal (blue scores when ball enters right goal)
  if (bl.x + BR > W - 30) {
    if (bl.y > GY1 && bl.y < GY2) {
      if (bl.x > W) {
        state.score.blue++
        state.phase = state.score.blue >= maxGoals ? 'finished' : 'goal_pause'
        state.lastGoal = 'blue'
        return
      }
    } else {
      bl.x = W - 30 - BR; bl.vx = -Math.abs(bl.vx) * 0.8
    }
  }

  // Ball–player collisions
  for (const p of players) {
    const pp = state.players[p.sessionId]
    if (!pp) continue
    const dx = bl.x - pp.x, dy = bl.y - pp.y
    const d = Math.hypot(dx, dy)
    const min = PR + BR
    if (d < min && d > 0) {
      const nx = dx / d, ny = dy / d
      bl.x = pp.x + nx * min; bl.y = pp.y + ny * min
      const rel = (bl.vx - pp.vx) * nx + (bl.vy - pp.vy) * ny
      if (rel < 0) {
        bl.vx -= rel * nx * 1.5
        bl.vy -= rel * ny * 1.5
      }
    }
  }
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, state: GState, players: LobbyPlayer[], myId: string, cd: number) {
  // Pitch
  ctx.fillStyle = '#1a7a1a'
  ctx.fillRect(0, 0, W, H)

  // Grass stripes
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.06)'
      ctx.fillRect(i * (W / 8), 0, W / 8, H)
    }
  }

  // Field markings
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 2
  ctx.strokeRect(30, 20, W - 60, H - 40)
  ctx.beginPath(); ctx.moveTo(W / 2, 20); ctx.lineTo(W / 2, H - 20); ctx.stroke()
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 55, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2); ctx.fill()
  ctx.strokeRect(30, H / 2 - 88, 100, 176)
  ctx.strokeRect(W - 130, H / 2 - 88, 100, 176)
  ctx.strokeRect(30, H / 2 - 48, 50, 96)
  ctx.strokeRect(W - 80, H / 2 - 48, 50, 96)

  // Goals
  ctx.fillStyle = 'rgba(255,80,30,0.18)'
  ctx.fillRect(0, GY1, GD, GY2 - GY1)
  ctx.fillStyle = 'rgba(30,90,255,0.18)'
  ctx.fillRect(W - GD, GY1, GD, GY2 - GY1)
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 3
  ctx.strokeRect(0, GY1, GD, GY2 - GY1)
  ctx.strokeRect(W - GD, GY1, GD, GY2 - GY1)
  // Goal net lines
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 1
  for (let y = GY1 + 13; y < GY2; y += 13) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GD, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W - GD, y); ctx.lineTo(W, y); ctx.stroke()
  }

  // Scoreboard
  ctx.fillStyle = 'rgba(0,0,0,0.52)'
  ctx.beginPath()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ctx as any).roundRect?.(W / 2 - 64, 5, 128, 42, 8) ?? ctx.rect(W / 2 - 64, 5, 128, 42)
  ctx.fill()

  ctx.font = 'bold 28px monospace'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#FF6B33'
  ctx.textAlign = 'right'
  ctx.fillText(String(state.score.red), W / 2 - 14, 8)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '18px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('–', W / 2, 13)
  ctx.fillStyle = '#5588FF'
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(String(state.score.blue), W / 2 + 14, 8)

  const mins = Math.floor(state.timeLeft / 60)
  const secs = state.timeLeft % 60
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, W / 2, 48)

  // Players
  for (const p of players) {
    const pp = state.players[p.sessionId]
    if (!pp) continue
    const isMe = p.sessionId === myId
    const col = p.team === 'blue' ? '#1a45aa' : '#bb3300'
    const bright = p.team === 'blue' ? '#4477ee' : '#ff5522'

    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath(); ctx.ellipse(pp.x + 2, pp.y + PR * 0.45, PR * 0.85, PR * 0.32, 0, 0, Math.PI * 2); ctx.fill()

    const g = ctx.createRadialGradient(pp.x - PR * 0.3, pp.y - PR * 0.35, 0, pp.x, pp.y, PR)
    g.addColorStop(0, bright)
    g.addColorStop(1, col)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(pp.x, pp.y, PR, 0, Math.PI * 2); ctx.fill()

    if (isMe) { ctx.strokeStyle = 'white'; ctx.lineWidth = 2.5; ctx.stroke() }

    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = `bold ${PR - 1}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(p.displayName[0].toUpperCase(), pp.x, pp.y + 0.5)
  }

  // Ball
  const { x: bx, y: by, vx: bvx, vy: bvy } = state.ball
  const bspd = Math.hypot(bvx, bvy)

  if (bspd > 4) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(bspd * 0.022, 0.22)})`
    ctx.beginPath(); ctx.arc(bx - bvx * 1.4, by - bvy * 1.4, BR * 0.6, 0, Math.PI * 2); ctx.fill()
  }

  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath(); ctx.ellipse(bx + 1, by + 3, BR, BR * 0.38, 0, 0, Math.PI * 2); ctx.fill()

  const bg = ctx.createRadialGradient(bx - BR * 0.33, by - BR * 0.33, 0, bx, by, BR)
  bg.addColorStop(0, '#fff')
  bg.addColorStop(1, '#ccc')
  ctx.fillStyle = bg
  ctx.beginPath(); ctx.arc(bx, by, BR, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = '#222'
  ctx.beginPath(); ctx.arc(bx, by, BR * 0.3, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    ctx.beginPath(); ctx.arc(bx + Math.cos(a) * BR * 0.65, by + Math.sin(a) * BR * 0.65, BR * 0.17, 0, Math.PI * 2); ctx.fill()
  }

  // Overlays
  if (state.phase === 'countdown' && cd > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'white'
    ctx.font = 'bold 130px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(cd), W / 2, H / 2)
    ctx.font = '20px Arial'
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillText('Klaar voor de aftrap?', W / 2, H / 2 + 90)
  }

  if (state.phase === 'goal_pause') {
    ctx.fillStyle = 'rgba(0,0,0,0.48)'
    ctx.fillRect(0, 0, W, H)
    const gc = state.lastGoal === 'blue' ? '#5588FF' : '#FF6B33'
    ctx.fillStyle = gc
    ctx.font = 'bold 82px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚽ GOAL!', W / 2, H / 2 - 22)
    ctx.font = 'bold 26px Arial'
    ctx.fillStyle = 'white'
    ctx.fillText(state.lastGoal === 'blue' ? 'Blauw scoort!' : 'Oranje scoort!', W / 2, H / 2 + 44)
  }

  if (state.phase === 'finished') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, 0, W, H)
    const { blue: sb, red: sr } = state.score
    const draw = sb === sr
    ctx.fillStyle = draw ? 'white' : sb > sr ? '#5588FF' : '#FF6B33'
    ctx.font = 'bold 58px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(draw ? '🤝 Gelijkspel!' : `🏆 ${sb > sr ? 'Blauw' : 'Oranje'} wint!`, W / 2, H / 2 - 28)
    ctx.font = 'bold 38px monospace'
    ctx.fillStyle = 'white'
    ctx.fillText(`${sr}  –  ${sb}`, W / 2, H / 2 + 36)
    ctx.font = '15px Arial'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText('Host drukt R om opnieuw te spelen', W / 2, H / 2 + 84)
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function GameRoom({ code }: { code: string }) {
  const sessionId = useMemo(getSessionId, [])
  const savedName = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('spel_display_name') ?? '' : ''), [])

  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null)
  const [nameInput, setNameInput] = useState(savedName)
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  const [uiPhase, setUiPhase] = useState<Phase>('lobby')
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const physRef = useRef<GState | null>(null)
  const inputsRef = useRef<Record<string, Keys>>({})
  const myKeysRef = useRef<Keys>({ up: false, down: false, left: false, right: false, space: false })
  const lobbyRef = useRef<LobbyPlayer[]>([])
  const joinInfoRef = useRef<JoinInfo | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const rafRef = useRef<number>(0)
  const countdownRef = useRef<number>(3)
  const broadcastTickRef = useRef<number>(0)
  const goalPauseActiveRef = useRef<boolean>(false)

  lobbyRef.current = lobbyPlayers

  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  // Auto-join if name known
  useEffect(() => {
    if (savedName) doJoin(savedName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function doJoin(name: string) {
    setJoining(true); setJoinError('')
    const res = await fetch('/api/spel/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, displayName: name, sessionId }),
    })
    const data = await res.json()
    setJoining(false)
    if (data.error) { setJoinError(data.error); return }
    const info: JoinInfo = {
      team: data.team, playerIndex: data.playerIndex,
      isHost: data.isHost, displayName: name, room: data.room,
    }
    joinInfoRef.current = info
    setJoinInfo(info)
  }

  // Realtime channel
  useEffect(() => {
    if (!joinInfo) return
    const channel = supabase.channel(`game:${code}`, { config: { broadcast: { self: false } } })

    channel
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        const p = payload as LobbyPlayer
        setLobbyPlayers(prev => {
          if (prev.find(x => x.sessionId === p.sessionId)) return prev
          const next = [...prev, p]
          if (joinInfoRef.current?.isHost) {
            channel.send({ type: 'broadcast', event: 'lobby_sync', payload: { players: next } })
          }
          return next
        })
      })
      .on('broadcast', { event: 'lobby_sync' }, ({ payload }) => {
        setLobbyPlayers(payload.players as LobbyPlayer[])
      })
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        if (joinInfoRef.current?.isHost) return
        physRef.current = payload.state as GState
        countdownRef.current = 3
        setUiPhase('countdown')
      })
      .on('broadcast', { event: 'countdown_tick' }, ({ payload }) => {
        if (joinInfoRef.current?.isHost) return
        countdownRef.current = payload.value as number
        if (payload.value <= 0 && physRef.current) {
          physRef.current.phase = 'playing'
          setUiPhase('playing')
        }
      })
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        if (joinInfoRef.current?.isHost) {
          inputsRef.current[payload.sessionId as string] = payload.keys as Keys
        }
      })
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        if (joinInfoRef.current?.isHost) return
        physRef.current = payload.state as GState
        setUiPhase((payload.state as GState).phase)
      })
      .on('broadcast', { event: 'restart' }, () => {
        if (joinInfoRef.current?.isHost) return
        physRef.current = null
        goalPauseActiveRef.current = false
        setUiPhase('lobby')
      })
      .subscribe()

    channelRef.current = channel

    const me: LobbyPlayer = {
      sessionId, displayName: joinInfo.displayName,
      team: joinInfo.team, playerIndex: joinInfo.playerIndex,
    }
    setLobbyPlayers([me])
    channel.send({ type: 'broadcast', event: 'player_joined', payload: me })

    return () => { channel.unsubscribe() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinInfo, code, sessionId])

  // Canvas scaling
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const resize = () => {
      const scale = Math.min(container.clientWidth / W, (window.innerHeight * 0.78) / H)
      canvas.style.transform = `scale(${scale})`
      canvas.style.transformOrigin = 'top left'
      container.style.height = `${Math.round(H * scale)}px`
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [joinInfo])

  // Host: start game
  function handleStart() {
    const info = joinInfoRef.current
    if (!info?.isHost) return
    const players = lobbyRef.current
    const state = makeState(players, info.room.teamSize, info.room.maxMinutes)
    physRef.current = state
    goalPauseActiveRef.current = false
    setUiPhase('countdown')
    countdownRef.current = 3

    channelRef.current?.send({ type: 'broadcast', event: 'game_start', payload: { state } })

    let cd = 3
    const iv = setInterval(() => {
      cd--
      countdownRef.current = cd
      channelRef.current?.send({ type: 'broadcast', event: 'countdown_tick', payload: { value: cd } })
      if (cd <= 0) {
        clearInterval(iv)
        if (physRef.current) { physRef.current.phase = 'playing'; setUiPhase('playing') }
      }
    }, 1000)
  }

  // Host: timer
  useEffect(() => {
    const info = joinInfoRef.current
    if (!info?.isHost || uiPhase !== 'playing') return
    const iv = setInterval(() => {
      const s = physRef.current
      if (!s || s.phase !== 'playing') { clearInterval(iv); return }
      s.timeLeft = Math.max(0, s.timeLeft - 1)
      if (s.timeLeft <= 0) {
        s.phase = 'finished'
        setUiPhase('finished')
        clearInterval(iv)
        channelRef.current?.send({ type: 'broadcast', event: 'game_state', payload: { state: s } })
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [uiPhase])

  // Keyboard
  useEffect(() => {
    if (!joinInfo) return
    const onDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
      const k = myKeysRef.current
      if (e.key === 'ArrowUp')    k.up = true
      if (e.key === 'ArrowDown')  k.down = true
      if (e.key === 'ArrowLeft')  k.left = true
      if (e.key === 'ArrowRight') k.right = true
      if (e.key === ' ')          k.space = true
      if (!joinInfoRef.current?.isHost && physRef.current?.phase === 'playing')
        channelRef.current?.send({ type: 'broadcast', event: 'input', payload: { sessionId, keys: { ...k } } })
      // Restart
      if ((e.key === 'r' || e.key === 'R') && joinInfoRef.current?.isHost && physRef.current?.phase === 'finished') {
        channelRef.current?.send({ type: 'broadcast', event: 'restart', payload: {} })
        physRef.current = null
        goalPauseActiveRef.current = false
        setUiPhase('lobby')
      }
    }
    const onUp = (e: KeyboardEvent) => {
      const k = myKeysRef.current
      if (e.key === 'ArrowUp')    k.up = false
      if (e.key === 'ArrowDown')  k.down = false
      if (e.key === 'ArrowLeft')  k.left = false
      if (e.key === 'ArrowRight') k.right = false
      if (e.key === ' ')          k.space = false
      if (!joinInfoRef.current?.isHost && physRef.current?.phase === 'playing')
        channelRef.current?.send({ type: 'broadcast', event: 'input', payload: { sessionId, keys: { ...k } } })
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [joinInfo, sessionId])

  // Game loop
  useEffect(() => {
    if (!joinInfo) return
    const loop = () => {
      const state = physRef.current
      const ctx = canvasRef.current?.getContext('2d')
      const info = joinInfoRef.current
      if (state && ctx) {
        if (info?.isHost && state.phase === 'playing') {
          inputsRef.current[sessionId] = myKeysRef.current
          step(state, inputsRef.current, lobbyRef.current, info.room.maxGoals)

          const phaseAfterStep = state.phase as Phase
          if ((phaseAfterStep === 'goal_pause' || phaseAfterStep === 'finished') && !goalPauseActiveRef.current) {
            goalPauseActiveRef.current = true
            setUiPhase(phaseAfterStep)
            channelRef.current?.send({ type: 'broadcast', event: 'game_state', payload: { state: JSON.parse(JSON.stringify(state)) } })

            if (phaseAfterStep === 'goal_pause') {
              setTimeout(() => {
                const s = physRef.current
                if (!s) return
                resetAfterGoal(s, lobbyRef.current, info.room.teamSize)
                s.phase = 'playing'
                goalPauseActiveRef.current = false
                setUiPhase('playing')
                channelRef.current?.send({ type: 'broadcast', event: 'game_state', payload: { state: JSON.parse(JSON.stringify(s)) } })
              }, 2000)
            }
          }

          broadcastTickRef.current++
          if (broadcastTickRef.current % 2 === 0) {
            channelRef.current?.send({ type: 'broadcast', event: 'game_state', payload: { state: JSON.parse(JSON.stringify(state)) } })
          }
        }
        draw(ctx, state, lobbyRef.current, sessionId, countdownRef.current)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [joinInfo, sessionId])

  // ── Name entry screen ───────────────────────────────────────────────────────
  if (!joinInfo) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="card">
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            Spel <span className="font-mono text-knvb-500 tracking-widest">{code}</span>
          </h2>
          <p className="text-sm text-gray-400 mb-4">Vul je naam in om mee te spelen</p>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && nameInput.trim() && (localStorage.setItem('spel_display_name', nameInput), doJoin(nameInput))}
            placeholder="Jouw naam"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-knvb-400"
            maxLength={16}
            autoFocus
          />
          {joinError && <p className="text-red-500 text-sm mb-3">{joinError}</p>}
          <button
            onClick={() => { localStorage.setItem('spel_display_name', nameInput); doJoin(nameInput) }}
            disabled={joining || !nameInput.trim()}
            className="w-full py-3 rounded-xl bg-oranje-500 hover:bg-oranje-600 text-white font-bold disabled:opacity-40 transition-colors"
          >
            {joining ? 'Meedoen…' : 'Meespelen →'}
          </button>
        </div>
      </div>
    )
  }

  const maxPlayers = joinInfo.room.teamSize * 2
  const canStart = joinInfo.isHost && lobbyPlayers.length >= 2

  return (
    <div className="px-4 py-4 max-w-5xl mx-auto">
      {/* Lobby */}
      {uiPhase === 'lobby' && (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Spelcode</p>
            <p className="font-mono text-4xl font-black text-knvb-500 tracking-widest mb-2">{code}</p>
            <p className="text-xs text-gray-400 mb-4">
              {joinInfo.room.teamSize}v{joinInfo.room.teamSize} &nbsp;·&nbsp;
              eerste bij {joinInfo.room.maxGoals} doelpunten &nbsp;·&nbsp;
              max {joinInfo.room.maxMinutes} min
            </p>
            {joinInfo.isHost ? (
              <button onClick={handleStart} disabled={!canStart}
                className="w-full py-3 rounded-xl bg-oranje-500 hover:bg-oranje-600 text-white font-bold disabled:opacity-40 transition-colors">
                {canStart ? '⚽ Start spel' : `Wachten op spelers (${lobbyPlayers.length}/${maxPlayers})`}
              </button>
            ) : (
              <p className="text-sm text-gray-400 animate-pulse">Wachten tot de host het spel start…</p>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-3">Spelers in de lobby</h3>
            <div className="space-y-2">
              {lobbyPlayers.map(p => (
                <div key={p.sessionId} className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${p.team === 'blue' ? 'bg-knvb-500' : 'bg-oranje-500'}`}>
                    {p.displayName[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-800 font-medium">{p.displayName}</span>
                  <span className={`ml-auto text-xs font-semibold ${p.team === 'blue' ? 'text-knvb-500' : 'text-oranje-500'}`}>
                    {p.team === 'blue' ? '🔵 Blauw' : '🟠 Oranje'}
                  </span>
                  {p.sessionId === sessionId && <span className="text-xs text-gray-300">(jij)</span>}
                </div>
              ))}
              {lobbyPlayers.length < maxPlayers && (
                <p className="text-xs text-gray-300 pt-1 italic">
                  {maxPlayers - lobbyPlayers.length} plek{maxPlayers - lobbyPlayers.length > 1 ? 'ken' : ''} vrij
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      {uiPhase !== 'lobby' && (
        <div ref={containerRef} className="w-full overflow-hidden mb-2">
          <canvas ref={canvasRef} width={W} height={H} className="block" />
        </div>
      )}

      {/* Controls hint */}
      {uiPhase !== 'lobby' && (
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>
            Jij speelt als&nbsp;
            <strong className={joinInfo.team === 'blue' ? 'text-knvb-500' : 'text-oranje-500'}>
              {joinInfo.team === 'blue' ? '🔵 Blauw' : '🟠 Oranje'}
            </strong>
            &nbsp;·&nbsp;Pijltjes bewegen&nbsp;·&nbsp;Spatie schiet
          </span>
          {uiPhase === 'finished' && joinInfo.isHost && (
            <button onClick={() => {
              channelRef.current?.send({ type: 'broadcast', event: 'restart', payload: {} })
              physRef.current = null
              goalPauseActiveRef.current = false
              setUiPhase('lobby')
            }} className="px-4 py-1.5 rounded-lg bg-oranje-500 text-white text-sm font-medium hover:bg-oranje-600">
              Opnieuw spelen (R)
            </button>
          )}
        </div>
      )}

      <Link href="/spel" className="text-xs text-gray-400 hover:text-gray-600">← Nieuw spel</Link>
    </div>
  )
}
