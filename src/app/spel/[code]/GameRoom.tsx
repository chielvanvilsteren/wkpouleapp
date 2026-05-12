'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'
import Link from 'next/link'
import StickerbalTransition from '@/components/StickerbalTransition'
import StickerbalBackground from '@/components/StickerbalBackground'
import RematchVoting from '@/components/RematchVoting'

const INTRO_MUSIC   = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Pump.mp3'
const WINNER_MUSIC  = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Fanfare%20for%20Space.mp3'
const LOSER_MUSIC   = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Failing%20Defense.mp3'

// ── Canvas constants ────────────────────────────────────────────────────────
const W = 800, H = 500
const PR = 15          // player radius
const BR = 10          // ball radius
const GY1 = 190        // goal top y
const GY2 = 310        // goal bottom y
const FX = 30          // field left/right boundary x
const FY = 20          // field top/bottom boundary y
const POST_R = 5       // goalpost circle radius
const TICK_MS = 1000 / 60  // fixed 60 Hz physics tick

// Physics — base values (multiplied by speedMult per game)
const ACEL = 0.34
const PFRIC = 0.85
const BFRIC = 0.984
const MAXSPD = 4.8
const KICK = 10
const KRANGE = 28
const WALL_REST = 0.82
const BALL_REST = 1.6
const DRIBBLE_DIST = PR + BR + 3
const TACKLE_RANGE = PR * 2 + 18
const FIELD_CR = 58   // rounded corner radius

// Corner arc centers — inside these quadrants the rounded corner applies
const CORNER_CENTERS = [
  { cx: FX + FIELD_CR, cy: FY + FIELD_CR,       qx: -1, qy: -1 },
  { cx: W-FX-FIELD_CR, cy: FY + FIELD_CR,       qx:  1, qy: -1 },
  { cx: FX + FIELD_CR, cy: H-FY-FIELD_CR,       qx: -1, qy:  1 },
  { cx: W-FX-FIELD_CR, cy: H-FY-FIELD_CR,       qx:  1, qy:  1 },
]

// ── Types ────────────────────────────────────────────────────────────────────
type Team = 'blue' | 'red'
type Phase = 'lobby' | 'countdown' | 'playing' | 'goal_pause' | 'finished'
type PUType = 'turbo' | 'freeze' | 'supershot'

interface PowerUp { id: number; type: PUType; x: number; y: number }
interface PlayerEffect { type: PUType; expiresAt: number; used?: boolean }

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
  dribbling: string | null
  powerups: PowerUp[]
  effects: Record<string, PlayerEffect>
  puTick: number       // increments each step, used for effect expiry + spawn timing
  puNextAt: number     // puTick value to spawn next powerup
  puSpawned: number    // total spawned this game
  puMax: number        // max spawns (3-6), set at game start
  puNextId: number
  puQueue: PUType[]
  finishedAt: number   // puTick when game ended (0 = not finished)
}

interface JoinInfo {
  team: Team
  playerIndex: number
  isHost: boolean
  displayName: string
  room: { teamSize: number; maxGoals: number; maxMinutes: number; speedMultiplier: number; dribblingEnabled: boolean; powerupsEnabled: boolean; testMode: boolean }
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
    dribbling: null,
    powerups: [],
    effects: {},
    puTick: 0,
    puNextAt: 300 + Math.floor(Math.random() * 300),
    puSpawned: 0,
    puMax: 3 + Math.floor(Math.random() * 4),
    puNextId: 0,
    puQueue: [],
    finishedAt: 0,
  }
}

function resetAfterGoal(state: GState, players: LobbyPlayer[], teamSize: number) {
  for (const p of players) {
    const { x, y } = startPos(p.team, p.playerIndex, teamSize)
    const pp = state.players[p.sessionId]
    if (pp) { pp.x = x; pp.y = y; pp.vx = 0; pp.vy = 0 }
  }
  state.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 }
  state.dribbling = null
  state.effects = {}
}

// ── Bot AI ────────────────────────────────────────────────────────────────────
function getBotInput(bot: PP, ball: { x: number; y: number }, team: Team, tick: number, botSessionId?: string, dribbling?: string | null): Keys {
  // Tackle if opponent is dribbling nearby
  const opponentDribbling = dribbling && dribbling !== botSessionId
  if (opponentDribbling) {
    const dx = ball.x - bot.x, dy = ball.y - bot.y
    const dist = Math.hypot(dx, dy)
    if (dist < TACKLE_RANGE) return { up: false, down: false, left: false, right: false, space: true }
  }
  // Shoot if we are dribbling and near opponent goal
  if (dribbling === botSessionId) {
    const goalX = team === 'blue' ? W - FX : FX
    const distToGoal = Math.abs(bot.x - goalX)
    if (distToGoal < 200) return {
      up: Math.abs(bot.y - H / 2) > 20 ? bot.y > H / 2 : false,
      down: Math.abs(bot.y - H / 2) > 20 ? bot.y < H / 2 : false,
      left: team === 'red',
      right: team === 'blue',
      space: distToGoal < 120,
    }
  }
  const attackX = team === 'blue' ? W - FX - 20 : FX + 20
  const dxBall = ball.x - bot.x
  const dyBall = ball.y - bot.y
  const distBall = Math.hypot(dxBall, dyBall)

  // Deterministic noise so bot isn't perfectly accurate
  const jitterX = Math.sin(tick * 0.07) * 18
  const jitterY = Math.cos(tick * 0.11) * 18

  let tx: number, ty: number
  if (distBall < 130) {
    // Position behind ball relative to goal, then push through
    tx = attackX + jitterX * 0.4
    ty = ball.y + jitterY * 0.3
  } else {
    // Chase ball with slight prediction
    tx = ball.x + dxBall * 0.12 + jitterX
    ty = ball.y + dyBall * 0.12 + jitterY
  }

  const dead = 10
  return {
    up:    ty - bot.y < -dead,
    down:  ty - bot.y >  dead,
    left:  tx - bot.x < -dead,
    right: tx - bot.x >  dead,
    space: distBall < KRANGE + 10,
  }
}

// ── Physics ───────────────────────────────────────────────────────────────────
const POSTS = [
  { x: FX, y: GY1 }, { x: FX, y: GY2 },
  { x: W - FX, y: GY1 }, { x: W - FX, y: GY2 },
]

const PU_RADIUS = 16
const PU_DURATION: Record<PUType, number> = { turbo: 300, freeze: 180, supershot: 600 }
const PU_TYPES: PUType[] = ['turbo', 'freeze', 'supershot']

function shufflePUTypes(): PUType[] {
  const a = [...PU_TYPES]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function spawnPowerUp(state: GState) {
  // Cycle through shuffled types — reshuffle after every full cycle
  if (!state.puQueue || state.puQueue.length === 0) state.puQueue = shufflePUTypes()
  const type = state.puQueue.shift()!

  const x = FX + 80 + Math.random() * (W - (FX + 80) * 2)
  const y = FY + 30 + Math.random() * (H - (FY + 30) * 2)
  state.powerups.push({ id: state.puNextId++, type, x, y })
  state.puSpawned++
  // Next spawn: 5–15 seconds (300–900 ticks at 60Hz)
  state.puNextAt = state.puTick + 300 + Math.floor(Math.random() * 600)
}

function step(state: GState, inputs: Record<string, Keys>, players: LobbyPlayer[], maxGoals: number, speedMult = 1.0, dribblingEnabled = true, powerupsEnabled = false) {
  if (state.phase !== 'playing') return
  state.puTick++
  const acel = ACEL * speedMult
  const maxSpd = MAXSPD * speedMult

  // Power-up spawning
  if (powerupsEnabled && state.puSpawned < state.puMax && state.powerups.length === 0 && state.puTick >= state.puNextAt) {
    spawnPowerUp(state)
  }

  // Power-up collection + freeze effect distribution
  if (powerupsEnabled) {
    for (const p of players) {
      const pp = state.players[p.sessionId]
      if (!pp) continue
      for (let i = state.powerups.length - 1; i >= 0; i--) {
        const pu = state.powerups[i]
        if (Math.hypot(pp.x - pu.x, pp.y - pu.y) < PR + PU_RADIUS) {
          if (pu.type === 'freeze') {
            // Freeze all opponents
            const myTeam = players.find(q => q.sessionId === p.sessionId)?.team
            for (const q of players) {
              if (q.team !== myTeam) state.effects[q.sessionId] = { type: 'freeze', expiresAt: state.puTick + PU_DURATION.freeze }
            }
          } else {
            state.effects[p.sessionId] = { type: pu.type, expiresAt: state.puTick + PU_DURATION[pu.type] }
          }
          state.powerups.splice(i, 1)
          break
        }
      }
    }
  }

  // Players
  for (const p of players) {
    const pp = state.players[p.sessionId]
    if (!pp) continue
    const k = inputs[p.sessionId] ?? {}

    // Effect checks
    const eff = state.effects[p.sessionId]
    const isFrozen = eff?.type === 'freeze' && state.puTick < eff.expiresAt
    const hasTurbo = eff?.type === 'turbo' && state.puTick < eff.expiresAt
    const effectAcel = hasTurbo ? acel * 2 : acel
    const effectMaxSpd = hasTurbo ? maxSpd * 2 : maxSpd

    if (isFrozen) continue  // frozen: no movement

    if (k.up)    pp.vy -= effectAcel
    if (k.down)  pp.vy += effectAcel
    if (k.left)  pp.vx -= effectAcel
    if (k.right) pp.vx += effectAcel

    const spd = Math.hypot(pp.vx, pp.vy)
    if (spd > effectMaxSpd) { pp.vx = pp.vx / spd * effectMaxSpd; pp.vy = pp.vy / spd * effectMaxSpd }

    pp.vx *= PFRIC; pp.vy *= PFRIC
    pp.x += pp.vx; pp.y += pp.vy

    // Field boundary — straight walls (skip corner zones)
    const L = FX + PR, R = W - FX - PR, T = FY + PR, B = H - FY - PR
    const inCornerZoneY = pp.y < FY + FIELD_CR || pp.y > H - FY - FIELD_CR
    const inCornerZoneX = pp.x < FX + FIELD_CR || pp.x > W - FX - FIELD_CR
    if (pp.x < L && !inCornerZoneY) { pp.x = L; pp.vx = Math.abs(pp.vx) * 0.5 }
    if (pp.x > R && !inCornerZoneY) { pp.x = R; pp.vx = -Math.abs(pp.vx) * 0.5 }
    if (pp.y < T && !inCornerZoneX) { pp.y = T; pp.vy = Math.abs(pp.vy) * 0.5 }
    if (pp.y > B && !inCornerZoneX) { pp.y = B; pp.vy = -Math.abs(pp.vy) * 0.5 }
    // Corner arc collision
    for (const cc of CORNER_CENTERS) {
      if ((cc.qx < 0 ? pp.x <= cc.cx : pp.x >= cc.cx) && (cc.qy < 0 ? pp.y <= cc.cy : pp.y >= cc.cy)) {
        const dx = pp.x - cc.cx, dy = pp.y - cc.cy
        const d = Math.hypot(dx, dy), maxD = FIELD_CR - PR
        if (d > maxD && d > 0) {
          const nx = dx / d, ny = dy / d
          pp.x = cc.cx + nx * maxD; pp.y = cc.cy + ny * maxD
          const dot = pp.vx * nx + pp.vy * ny
          if (dot > 0) { pp.vx -= dot * nx * 0.9; pp.vy -= dot * ny * 0.9 }
        }
      }
    }

    // Spacebar: shoot/tackle (dribbling mode) or classic kick
    const hasSupershot = eff?.type === 'supershot' && state.puTick < eff.expiresAt
    const kickForce = hasSupershot ? KICK * 3 : KICK

    if (k.space && !dribblingEnabled) {
      const dx = state.ball.x - pp.x, dy = state.ball.y - pp.y
      const d = Math.hypot(dx, dy)
      if (d < KRANGE && d > 0) {
        state.ball.vx += dx / d * kickForce; state.ball.vy += dy / d * kickForce
        if (hasSupershot) delete state.effects[p.sessionId]
      }
    }
    if (k.space && dribblingEnabled) {
      if (state.dribbling === p.sessionId) {
        // Shoot — kick ball in movement direction
        const spd2 = Math.hypot(pp.vx, pp.vy)
        const nx = spd2 > 0.1 ? pp.vx / spd2 : 1
        const ny = spd2 > 0.1 ? pp.vy / spd2 : 0
        state.ball.vx = nx * kickForce + pp.vx
        state.ball.vy = ny * kickForce + pp.vy
        state.dribbling = null
        if (hasSupershot) delete state.effects[p.sessionId]
      } else if (state.dribbling && state.dribbling !== p.sessionId) {
        // Tackle attempt
        const dribPP = state.players[state.dribbling]
        if (dribPP) {
          const dx = dribPP.x - pp.x, dy = dribPP.y - pp.y
          if (Math.hypot(dx, dy) < TACKLE_RANGE) {
            // Free ball in random-ish deflection direction
            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2
            state.ball.vx = Math.cos(angle) * KICK * 0.7
            state.ball.vy = Math.sin(angle) * KICK * 0.7
            state.dribbling = null
          }
        }
      }
    }
  }

  // Player–player elastic collision
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
          a.vx -= rel * nx; a.vy -= rel * ny
          b.vx += rel * nx; b.vy += rel * ny
        }
      }
    }
  }

  // Ball
  const bl = state.ball
  if (!state.dribbling) {
    bl.vx *= BFRIC; bl.vy *= BFRIC
    bl.x += bl.vx; bl.y += bl.vy
  }

  // Top / bottom walls (skip corner zones)
  if (bl.y - BR < FY && bl.x >= FX + FIELD_CR && bl.x <= W - FX - FIELD_CR) { bl.y = FY + BR; bl.vy = Math.abs(bl.vy) * WALL_REST }
  if (bl.y + BR > H - FY && bl.x >= FX + FIELD_CR && bl.x <= W - FX - FIELD_CR) { bl.y = H - FY - BR; bl.vy = -Math.abs(bl.vy) * WALL_REST }

  // Corner arc collision for ball
  for (const cc of CORNER_CENTERS) {
    if ((cc.qx < 0 ? bl.x <= cc.cx : bl.x >= cc.cx) && (cc.qy < 0 ? bl.y <= cc.cy : bl.y >= cc.cy)) {
      const dx = bl.x - cc.cx, dy = bl.y - cc.cy
      const d = Math.hypot(dx, dy), maxD = FIELD_CR - BR
      if (d > maxD && d > 0) {
        const nx = dx / d, ny = dy / d
        bl.x = cc.cx + nx * maxD; bl.y = cc.cy + ny * maxD
        const dot = bl.vx * nx + bl.vy * ny
        if (dot > 0) { bl.vx -= 2 * dot * nx * WALL_REST; bl.vy -= 2 * dot * ny * WALL_REST }
      }
    }
  }

  // Left wall — open at goal (only straight section, not corners)
  if (bl.x - BR < FX && bl.y >= FY + FIELD_CR && bl.y <= H - FY - FIELD_CR) {
    if (bl.y > GY1 + POST_R && bl.y < GY2 - POST_R) {
      if (bl.x - BR < 0) {
        state.score.red++
        state.phase = state.score.red >= maxGoals ? 'finished' : 'goal_pause'
        if (state.phase === 'finished') state.finishedAt = state.puTick
        state.lastGoal = 'red'
        return
      }
      // ball is inside goal mouth, let it slide
    } else {
      bl.x = FX + BR; bl.vx = Math.abs(bl.vx) * WALL_REST
    }
  }

  // Right wall — open at goal (only straight section, not corners)
  if (bl.x + BR > W - FX && bl.y >= FY + FIELD_CR && bl.y <= H - FY - FIELD_CR) {
    if (bl.y > GY1 + POST_R && bl.y < GY2 - POST_R) {
      if (bl.x + BR > W) {
        state.score.blue++
        state.phase = state.score.blue >= maxGoals ? 'finished' : 'goal_pause'
        if (state.phase === 'finished') state.finishedAt = state.puTick
        state.lastGoal = 'blue'
        return
      }
    } else {
      bl.x = W - FX - BR; bl.vx = -Math.abs(bl.vx) * WALL_REST
    }
  }

  // Goal post collisions
  for (const post of POSTS) {
    const dx = bl.x - post.x, dy = bl.y - post.y
    const d = Math.hypot(dx, dy)
    const min = BR + POST_R
    if (d < min && d > 0) {
      const nx = dx / d, ny = dy / d
      bl.x = post.x + nx * min; bl.y = post.y + ny * min
      const dot = bl.vx * nx + bl.vy * ny
      if (dot < 0) { bl.vx -= 2 * dot * nx * WALL_REST; bl.vy -= 2 * dot * ny * WALL_REST }
    }
  }

  // Dribble: ball follows dribbling player (only when enabled)
  if (!dribblingEnabled) { state.dribbling = null }
  if (dribblingEnabled && state.dribbling) {
    const dp = state.players[state.dribbling]
    if (dp) {
      const spd = Math.hypot(dp.vx, dp.vy)
      if (spd > 0.2) {
        // Ball in front of player
        bl.x = dp.x + (dp.vx / spd) * DRIBBLE_DIST
        bl.y = dp.y + (dp.vy / spd) * DRIBBLE_DIST
      } else {
        // Player stationary — keep ball at same relative position
        const dx = bl.x - dp.x, dy = bl.y - dp.y
        const d = Math.hypot(dx, dy)
        if (d > 0) {
          bl.x = dp.x + (dx / d) * DRIBBLE_DIST
          bl.y = dp.y + (dy / d) * DRIBBLE_DIST
        }
      }
      bl.vx = dp.vx; bl.vy = dp.vy

      // Auto-release in corner — player near both side wall AND top/bottom wall
      const CORNER = PR + 28
      const nearLR = dp.x < FX + CORNER || dp.x > W - FX - CORNER
      const nearTB = dp.y < FY + CORNER || dp.y > H - FY - CORNER
      if (nearLR && nearTB) {
        state.dribbling = null
        // Push ball toward center of field
        const cx = W / 2 - bl.x, cy = H / 2 - bl.y
        const cd = Math.hypot(cx, cy)
        if (cd > 0) { bl.vx = (cx / cd) * 4; bl.vy = (cy / cd) * 4 }
      }
    } else {
      state.dribbling = null
    }
  } else {
    // Auto-grab when dribbling enabled
    if (dribblingEnabled) {
      for (const p of players) {
        const pp = state.players[p.sessionId]
        if (!pp) continue
        const dx = bl.x - pp.x, dy = bl.y - pp.y
        if (Math.hypot(dx, dy) < PR + BR + 1) { state.dribbling = p.sessionId; break }
      }
    }

    // Elastic collision — always runs (dribbling disabled, or auto-grab missed)
    if (!state.dribbling) {
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
          if (rel < 0) { bl.vx -= rel * nx * BALL_REST; bl.vy -= rel * ny * BALL_REST }
        }
      }
    }
  }
}

// ── Rendering (HaxBall style) ──────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, state: GState, players: LobbyPlayer[], myId: string, cd: number, fps = 0, dribbling?: string | null, testMode = false) {
  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, W, H)

  // ── Rounded field (clip path) ────────────────────────────────────────────────
  function roundedFieldPath() {
    ctx.beginPath()
    ctx.moveTo(FX + FIELD_CR, FY)
    ctx.lineTo(W - FX - FIELD_CR, FY)
    ctx.arcTo(W - FX, FY, W - FX, FY + FIELD_CR, FIELD_CR)
    ctx.lineTo(W - FX, H - FY - FIELD_CR)
    ctx.arcTo(W - FX, H - FY, W - FX - FIELD_CR, H - FY, FIELD_CR)
    ctx.lineTo(FX + FIELD_CR, H - FY)
    ctx.arcTo(FX, H - FY, FX, H - FY - FIELD_CR, FIELD_CR)
    ctx.lineTo(FX, H - FY - FIELD_CR)
    ctx.arcTo(FX, FY, FX + FIELD_CR, FY, FIELD_CR)
    ctx.closePath()
  }

  // Fill field
  ctx.save()
  roundedFieldPath()
  ctx.fillStyle = '#222222'
  ctx.fill()
  ctx.restore()

  // ── Field markings (clipped to rounded field) ────────────────────────────────
  ctx.save()
  roundedFieldPath()
  ctx.clip()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2

  // Center line
  ctx.beginPath(); ctx.moveTo(W / 2, FY); ctx.lineTo(W / 2, H - FY); ctx.stroke()

  // Center circle
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2); ctx.fill()

  ctx.restore()

  // Field border (rounded)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  roundedFieldPath()
  ctx.stroke()

  // Erase goal openings on left/right wall
  ctx.strokeStyle = '#222222'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(FX, GY1); ctx.lineTo(FX, GY2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(W - FX, GY1); ctx.lineTo(W - FX, GY2); ctx.stroke()

  // ── Goals (rounded D-shape) ─────────────────────────────────────────────────
  const gr = 12  // corner radius for goal net

  function goalPath(side: 'left' | 'right') {
    const x0 = side === 'left' ? 0 : W
    const x1 = side === 'left' ? FX : W - FX
    const dir = side === 'left' ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(x1, GY1)
    ctx.lineTo(x0 + dir * gr, GY1)
    ctx.quadraticCurveTo(x0, GY1, x0, GY1 + gr)
    ctx.lineTo(x0, GY2 - gr)
    ctx.quadraticCurveTo(x0, GY2, x0 + dir * gr, GY2)
    ctx.lineTo(x1, GY2)
    ctx.closePath()
  }

  goalPath('left')
  ctx.fillStyle = 'rgba(220,60,60,0.14)'
  ctx.fill()

  goalPath('right')
  ctx.fillStyle = 'rgba(60,100,220,0.14)'
  ctx.fill()

  // Net grid lines clipped to rounded shape
  ctx.save()
  goalPath('left'); ctx.clip()
  ctx.strokeStyle = 'rgba(255,255,255,0.11)'
  ctx.lineWidth = 1
  for (let y = GY1 + 16; y < GY2; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FX, y); ctx.stroke() }
  for (let x = 8; x < FX; x += 8) { ctx.beginPath(); ctx.moveTo(x, GY1); ctx.lineTo(x, GY2); ctx.stroke() }
  ctx.restore()

  ctx.save()
  goalPath('right'); ctx.clip()
  ctx.strokeStyle = 'rgba(255,255,255,0.11)'
  ctx.lineWidth = 1
  for (let y = GY1 + 16; y < GY2; y += 16) { ctx.beginPath(); ctx.moveTo(W, y); ctx.lineTo(W - FX, y); ctx.stroke() }
  for (let x = 8; x < FX; x += 8) { ctx.beginPath(); ctx.moveTo(W - x, GY1); ctx.lineTo(W - x, GY2); ctx.stroke() }
  ctx.restore()

  // Goal posts (colored circles — red left, blue right)
  const drawPost = (x: number, y: number, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(x, y, POST_R, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  drawPost(FX, GY1, '#cc3333')
  drawPost(FX, GY2, '#cc3333')
  drawPost(W - FX, GY1, '#3355cc')
  drawPost(W - FX, GY2, '#3355cc')

  // ── Scoreboard (HaxBall top bar) ────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  ctx.fillRect(W / 2 - 80, 0, 160, 52)

  // Red score (left team)
  ctx.fillStyle = '#ff4444'
  ctx.font = 'bold 11px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('ROOD', W / 2 - 44, 4)
  ctx.font = 'bold 28px monospace'
  ctx.fillText(String(state.score.red), W / 2 - 40, 16)

  // Blue score (right team)
  ctx.fillStyle = '#4488ff'
  ctx.font = 'bold 11px Arial'
  ctx.fillText('BLAUW', W / 2 + 44, 4)
  ctx.font = 'bold 28px monospace'
  ctx.fillText(String(state.score.blue), W / 2 + 40, 16)

  // Divider + timer
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(W / 2 - 1, 4, 2, 44)

  const mins = Math.floor(state.timeLeft / 60)
  const secs = state.timeLeft % 60
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, W / 2, 50)

  // FPS + test mode — top right
  ctx.font = '10px monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  if (testMode) {
    ctx.fillStyle = '#88ff88'
    ctx.fillText('🔧 TEST', W - 6, 4)
  } else if (fps > 0) {
    ctx.fillStyle = fps < 50 ? '#ff4444' : fps < 55 ? '#ffaa00' : 'rgba(255,255,255,0.4)'
    ctx.fillText(`${Math.round(fps)} fps`, W - 6, 4)
  }

  // ── Power-ups ────────────────────────────────────────────────────────────────
  const PU_COLORS: Record<PUType, string> = { turbo: '#FFD700', freeze: '#44CCFF', supershot: '#FF4444' }
  const PU_EMOJI: Record<PUType, string> = { turbo: '⚡', freeze: '❄️', supershot: '💥' }
  const pulse = 0.75 + Math.sin(state.puTick * 0.12) * 0.25

  for (const pu of state.powerups) {
    const col = PU_COLORS[pu.type]
    // Pulsing glow ring
    ctx.shadowBlur = 18 * pulse; ctx.shadowColor = col
    ctx.strokeStyle = col; ctx.lineWidth = 2
    ctx.globalAlpha = pulse
    ctx.beginPath(); ctx.arc(pu.x, pu.y, PU_RADIUS + 4, 0, Math.PI * 2); ctx.stroke()
    // Filled circle
    ctx.globalAlpha = 0.85
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.beginPath(); ctx.arc(pu.x, pu.y, PU_RADIUS, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke()
    // Emoji
    ctx.shadowBlur = 0; ctx.globalAlpha = 1
    ctx.font = `${PU_RADIUS * 1.1}px Arial`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(PU_EMOJI[pu.type], pu.x, pu.y + 1)
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0

  // ── Players ─────────────────────────────────────────────────────────────────
  for (const p of players) {
    const pp = state.players[p.sessionId]
    if (!pp) continue
    const isMe = p.sessionId === myId
    const teamColor = p.team === 'blue' ? '#4466ee' : '#ee3333'
    const teamBright = p.team === 'blue' ? '#6688ff' : '#ff5555'

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath(); ctx.ellipse(pp.x + 1.5, pp.y + 3, PR * 0.9, PR * 0.35, 0, 0, Math.PI * 2); ctx.fill()

    // Player circle
    const g = ctx.createRadialGradient(pp.x - PR * 0.3, pp.y - PR * 0.35, 0, pp.x, pp.y, PR)
    g.addColorStop(0, teamBright)
    g.addColorStop(1, teamColor)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(pp.x, pp.y, PR, 0, Math.PI * 2); ctx.fill()

    // Border — thicker + white for own player
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = isMe ? 2.5 : 1.5
    ctx.stroke()

    // Active effect glow + icon
    const eff = state.effects[p.sessionId]
    if (eff && state.puTick < eff.expiresAt) {
      const ec = PU_COLORS[eff.type]
      ctx.shadowBlur = 14; ctx.shadowColor = ec
      ctx.strokeStyle = ec; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(pp.x, pp.y, PR + 3, 0, Math.PI * 2); ctx.stroke()
      ctx.shadowBlur = 0
      ctx.font = '11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.fillText(PU_EMOJI[eff.type], pp.x, pp.y - PR - 2)
    }

    // Initial inside circle
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = `bold 12px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(p.displayName[0].toUpperCase(), pp.x, pp.y + 0.5)

    // Name label above — white bg for readability
    const label = isMe ? `${p.displayName} ◀` : p.displayName
    ctx.font = '10px Arial'
    const lw = ctx.measureText(label).width
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(pp.x - lw / 2 - 3, pp.y - PR - 16, lw + 6, 13)
    ctx.fillStyle = isMe ? '#ffdd88' : '#ffffff'
    ctx.textBaseline = 'top'
    ctx.fillText(label, pp.x, pp.y - PR - 15)
  }

  // ── Ball ────────────────────────────────────────────────────────────────────
  const { x: bx, y: by, vx: bvx, vy: bvy } = state.ball
  const bspd = Math.hypot(bvx, bvy)

  // Dribble glow
  if (dribbling) {
    const dribP = players.find(p => p.sessionId === dribbling)
    const glowColor = dribP?.team === 'blue' ? '80,140,255' : '255,120,40'
    ctx.shadowBlur = 18; ctx.shadowColor = `rgba(${glowColor},0.8)`
    ctx.beginPath(); ctx.arc(bx, by, BR + 4, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${glowColor},0.6)`; ctx.lineWidth = 2; ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Motion trail
  if (bspd > 5) {
    const alpha = Math.min(bspd * 0.018, 0.2)
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.beginPath(); ctx.arc(bx - bvx * 1.5, by - bvy * 1.5, BR * 0.55, 0, Math.PI * 2); ctx.fill()
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath(); ctx.ellipse(bx + 1, by + 2.5, BR * 0.95, BR * 0.36, 0, 0, Math.PI * 2); ctx.fill()

  // Ball (HaxBall: clean white circle with 3D gradient)
  const bg = ctx.createRadialGradient(bx - BR * 0.3, by - BR * 0.35, BR * 0.05, bx, by, BR)
  bg.addColorStop(0, '#ffffff')
  bg.addColorStop(0.65, '#dddddd')
  bg.addColorStop(1, '#999999')
  ctx.fillStyle = bg
  ctx.beginPath(); ctx.arc(bx, by, BR, 0, Math.PI * 2); ctx.fill()

  // ── Overlays ─────────────────────────────────────────────────────────────────
  if (state.phase === 'countdown' && cd > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 120px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(cd), W / 2, H / 2)
    ctx.font = '18px Arial'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('Klaar voor de aftrap?', W / 2, H / 2 + 80)
  }

  if (state.phase === 'goal_pause') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = state.lastGoal === 'blue' ? '#4488ff' : '#ff4444'
    ctx.font = 'bold 76px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('GOAL!', W / 2, H / 2 - 20)
    ctx.font = 'bold 24px Arial'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(state.lastGoal === 'blue' ? 'Blauw scoort!' : 'Rood scoort!', W / 2, H / 2 + 42)
  }

  if (state.phase === 'finished') {
    const { blue: sb, red: sr } = state.score
    const isDraw = sb === sr
    const myTeam = players.find(p => p.sessionId === myId)?.team
    const iWon = !isDraw && (myTeam === 'blue' ? sb > sr : sr > sb)
    const t = state.finishedAt > 0 ? (state.puTick - state.finishedAt) / 60 : 0

    // Fade to black
    const fade = Math.min(t / 0.4, 1)
    ctx.fillStyle = `rgba(0,0,0,${fade * 0.92})`
    ctx.fillRect(0, 0, W, H)

    if (t > 0.6) {
      const textT = Math.min((t - 0.6) / 0.35, 1)
      const ease = 1 - Math.pow(1 - textT, 3)

      // Slam text in from above
      const targetY = H / 2 - 20
      const y = -90 + (targetY + 90) * ease

      // Landing shake
      const shakeAmt = textT > 0.85 ? Math.sin((t - 0.6 - 0.35) * 80) * 5 * Math.max(0, 1 - (t - 0.95) * 5) : 0

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `900 ${Math.round(76 + (1 - ease) * 60)}px Impact, Arial Black, sans-serif`

      if (isDraw) {
        ctx.shadowColor = '#aaaaaa'; ctx.shadowBlur = 25
        ctx.fillStyle = '#cccccc'
        ctx.fillText('DRAW', W / 2 + shakeAmt, y)
        ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.strokeText('DRAW', W / 2 + shakeAmt, y)
      } else if (iWon) {
        // Gold WINNER
        ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 40
        ctx.fillStyle = '#FFD700'
        ctx.fillText('WINNER!', W / 2 + shakeAmt, y)
        ctx.shadowBlur = 0
        ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.strokeText('WINNER!', W / 2 + shakeAmt, y)
        // Flashing glow pulse
        ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 20 + Math.sin(t * 8) * 15
        ctx.fillStyle = 'rgba(255,220,0,0.25)'
        ctx.fillText('WINNER!', W / 2 + shakeAmt, y)
      } else {
        // Dark red LOSER
        ctx.shadowColor = '#660000'; ctx.shadowBlur = 30
        ctx.fillStyle = '#cc1111'
        ctx.fillText('LOSER!', W / 2 + shakeAmt, y)
        ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.strokeText('LOSER!', W / 2 + shakeAmt, y)
      }
      ctx.shadowBlur = 0
    }

    if (t > 1.4) {
      const a = Math.min((t - 1.4) / 0.5, 1)
      ctx.globalAlpha = a
      ctx.textAlign = 'center'

      // Winning team name
      if (!isDraw) {
        ctx.font = 'bold 18px Arial'
        ctx.fillStyle = iWon ? '#FFD700' : 'rgba(255,255,255,0.5)'
        ctx.textBaseline = 'middle'
        ctx.fillText(iWon ? 'JE HEBT GEWONNEN!' : 'BETER GELUK VOLGENDE KEER', W / 2, H / 2 + 44)
      }

      // Score
      ctx.font = 'bold 28px monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText(`${sr}  –  ${sb}`, W / 2, H / 2 + 76)

      ctx.font = '12px Arial'
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fillText('Host drukt R om opnieuw te spelen', W / 2, H / 2 + 108)
      ctx.globalAlpha = 1
    }
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function GameRoom({ code, displayName: profileName }: { code: string; displayName?: string }) {
  const sessionId = useMemo(getSessionId, [])
  const savedName = useMemo(() => {
    if (profileName) return profileName
    return typeof window !== 'undefined' ? localStorage.getItem('spel_display_name') ?? '' : ''
  }, [profileName])

  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null)
  const [nameInput, setNameInput] = useState(savedName)
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  const [uiPhase, setUiPhase] = useState<Phase>('lobby')
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([])
  const [showIntro, setShowIntro] = useState(false)
  const [showOutro, setShowOutro] = useState(false)
  const [showVoting, setShowVoting] = useState(false)
  const [votes, setVotes] = useState<Record<string, 'yes' | 'no'>>({})
  const [rematchCd, setRematchCd] = useState<number | null>(null)
  const votesRef = useRef<Record<string, 'yes' | 'no'>>({})
  const rematchCdRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const introAudioRef = useRef<HTMLAudioElement | null>(null)

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
  const botTickRef = useRef<number>(0)
  const fpsRef = useRef<number>(0)
  const speedMultRef = useRef<number>(1.0)

  lobbyRef.current = lobbyPlayers

  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  const startIntroMusic = useCallback((src = INTRO_MUSIC) => {
    introAudioRef.current?.pause()
    const audio = new Audio(src)
    audio.loop = false
    audio.volume = 0.5
    audio.play().catch(() => {})
    introAudioRef.current = audio
  }, [])

  const stopIntroMusic = useCallback(() => {
    introAudioRef.current?.pause()
    introAudioRef.current = null
  }, [])

  // Stop music on unmount
  useEffect(() => () => stopIntroMusic(), [stopIntroMusic])

  // Auto-join — always if profile name known, else if localStorage name set
  useEffect(() => {
    const name = profileName || savedName
    if (name) {
      localStorage.setItem('spel_display_name', name)
      doJoin(name)
    }
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
    speedMultRef.current = info.room.speedMultiplier ?? 1.0
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
        const incoming = payload.state as GState
        const prev = physRef.current
        physRef.current = incoming
        setUiPhase(incoming.phase)
        // Trigger outro for non-host when game just finished
        if (incoming.phase === 'finished' && prev?.phase !== 'finished') {
          setShowOutro(true)
          const myTx = joinInfoRef.current?.team
          const bwx = incoming.score.blue > incoming.score.red, rwx = incoming.score.red > incoming.score.blue
          const iWonx = myTx === 'blue' ? bwx : myTx === 'red' ? rwx : false
          const isDrawx = incoming.score.blue === incoming.score.red
          startIntroMusic(isDrawx ? INTRO_MUSIC : iWonx ? WINNER_MUSIC : LOSER_MUSIC)
        }
      })
      .on('broadcast', { event: 'game_intro' }, () => {
        if (joinInfoRef.current?.isHost) return  // host triggers itself directly
        setShowIntro(true)
        startIntroMusic()
      })
      .on('broadcast', { event: 'restart' }, () => {
        if (joinInfoRef.current?.isHost) return
        physRef.current = null
        goalPauseActiveRef.current = false
        setUiPhase('lobby')
      })
      .on('broadcast', { event: 'vote' }, ({ payload }) => {
        const sid = payload.sessionId as string
        const v = payload.vote as 'yes' | 'no'
        votesRef.current = { ...votesRef.current, [sid]: v }
        setVotes({ ...votesRef.current })
        if (v === 'no') { setRematchCd(null); if (rematchCdRef.current) { clearInterval(rematchCdRef.current); rematchCdRef.current = null } }
      })
      .on('broadcast', { event: 'rematch_countdown' }, ({ payload }) => {
        if (joinInfoRef.current?.isHost) return
        setRematchCd(payload.seconds as number)
      })
      .on('broadcast', { event: 'rematch_go' }, () => {
        if (joinInfoRef.current?.isHost) return
        setShowVoting(false); setRematchCd(null); votesRef.current = {}; setVotes({})
        physRef.current = null; goalPauseActiveRef.current = false
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
  // Called when host clicks the button — show intro for everyone first
  function handleClickStart() {
    const info = joinInfoRef.current
    if (!info?.isHost) return
    channelRef.current?.send({ type: 'broadcast', event: 'game_intro', payload: {} })
    setShowIntro(true)
    startIntroMusic()
  }

  function handleVote(sid: string, v: 'yes' | 'no') {
    const newVotes = { ...votesRef.current, [sid]: v }
    votesRef.current = newVotes
    setVotes({ ...newVotes })
    channelRef.current?.send({ type: 'broadcast', event: 'vote', payload: { sessionId: sid, vote: v } })
    if (v === 'no') { setRematchCd(null); if (rematchCdRef.current) { clearInterval(rematchCdRef.current); rematchCdRef.current = null } }

    // Check if all voted yes
    if (v === 'yes' && joinInfoRef.current?.isHost) {
      const allYes = lobbyRef.current.every(p => newVotes[p.sessionId] === 'yes')
      if (allYes) startRematchCountdown()
    }
  }

  async function saveGameResults() {
    const info = joinInfoRef.current
    if (!info?.isHost) return
    if (info.room.testMode) return
    const hasBots = lobbyRef.current.some(p => p.sessionId.startsWith('bot_'))
    if (hasBots) return
    const s = physRef.current
    if (!s) return
    const blueWins = s.score.blue > s.score.red
    const redWins = s.score.red > s.score.blue
    const results = lobbyRef.current.map(p => ({
      sessionId: p.sessionId,
      displayName: p.displayName,
      result: blueWins ? (p.team === 'blue' ? 'win' : 'loss') : redWins ? (p.team === 'red' ? 'win' : 'loss') : 'draw',
      goalsFor: p.team === 'blue' ? s.score.blue : s.score.red,
      goalsAgainst: p.team === 'blue' ? s.score.red : s.score.blue,
      roomCode: code,
    }))
    await fetch('/api/spel/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    }).catch(() => {})
  }

  function startRematchCountdown() {
    let cd = 10
    setRematchCd(cd)
    channelRef.current?.send({ type: 'broadcast', event: 'rematch_countdown', payload: { seconds: cd } })
    rematchCdRef.current = setInterval(() => {
      cd--
      setRematchCd(cd)
      channelRef.current?.send({ type: 'broadcast', event: 'rematch_countdown', payload: { seconds: cd } })
      if (cd <= 0) {
        clearInterval(rematchCdRef.current!); rematchCdRef.current = null
        setShowVoting(false); setRematchCd(null); votesRef.current = {}; setVotes({})
        channelRef.current?.send({ type: 'broadcast', event: 'rematch_go', payload: {} })
        physRef.current = null; goalPauseActiveRef.current = false
        handleClickStart()
      }
    }, 1000)
  }

  function handleAddBot() {
    const info = joinInfoRef.current
    if (!info?.isHost) return
    const existing = lobbyRef.current
    const maxPlayers = info.room.teamSize * 2
    if (existing.length >= maxPlayers) return

    const botNum = existing.filter(p => p.sessionId.startsWith('bot_')).length + 1
    let team: Team = 'blue', playerIndex = 0, assigned = false

    for (let i = 0; i < info.room.teamSize; i++) {
      if (!existing.find(p => p.team === 'blue' && p.playerIndex === i)) {
        team = 'blue'; playerIndex = i; assigned = true; break
      }
    }
    if (!assigned) {
      for (let i = 0; i < info.room.teamSize; i++) {
        if (!existing.find(p => p.team === 'red' && p.playerIndex === i)) {
          team = 'red'; playerIndex = i; break
        }
      }
    }

    const bot: LobbyPlayer = { sessionId: `bot_${botNum}`, displayName: `Bot ${botNum}`, team, playerIndex }
    setLobbyPlayers(prev => [...prev, bot])
    channelRef.current?.send({ type: 'broadcast', event: 'player_joined', payload: bot })
  }

  // Called after intro transition completes (host only)
  function handleStart() {
    stopIntroMusic()
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

  // Keyboard
  useEffect(() => {
    if (!joinInfo) return
    const onDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
      const k = myKeysRef.current
      if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') k.up = true
      if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') k.down = true
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') k.left = true
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = true
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
      if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') k.up = false
      if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') k.down = false
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') k.left = false
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = false
      if (e.key === ' ')          k.space = false
      if (!joinInfoRef.current?.isHost && physRef.current?.phase === 'playing')
        channelRef.current?.send({ type: 'broadcast', event: 'input', payload: { sessionId, keys: { ...k } } })
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [joinInfo, sessionId])

  // ── Single game loop: RAF + fixed-timestep accumulator ──────────────────────
  const [lowFps, setLowFps] = useState(false)

  useEffect(() => {
    if (!joinInfo) return
    const info = joinInfoRef.current

    let lastTime = performance.now()
    let accumulator = 0
    let fpsFrames = 0
    let fpsWindowStart = lastTime
    let warmupDone = false

    const loop = (now: number) => {
      fpsFrames++
      const fpsElapsed = now - fpsWindowStart
      if (fpsElapsed >= 1000) {
        const fps = (fpsFrames / fpsElapsed) * 1000
        fpsRef.current = fps
        if (warmupDone) setLowFps(fps < 50)
        fpsFrames = 0
        fpsWindowStart = now
        if (!warmupDone && now - lastTime > 3000) warmupDone = true
      }

      if (info?.isHost) {
        const rawDt = now - lastTime
        accumulator += Math.min(rawDt, 100)

        while (accumulator >= TICK_MS) {
          const state = physRef.current
          if (state?.phase === 'playing') {
            botTickRef.current++

            for (const p of lobbyRef.current) {
              if (p.sessionId.startsWith('bot_')) {
                const pp = state.players[p.sessionId]
                if (pp) inputsRef.current[p.sessionId] = getBotInput(pp, state.ball, p.team, botTickRef.current, p.sessionId, state.dribbling)
              }
            }
            inputsRef.current[sessionId] = myKeysRef.current
            step(state, inputsRef.current, lobbyRef.current, info.room.maxGoals, speedMultRef.current, info.room.dribblingEnabled, info.room.powerupsEnabled)

            broadcastTickRef.current++
            if (broadcastTickRef.current % 60 === 0) {
              state.timeLeft = Math.max(0, state.timeLeft - 1)
              if (state.timeLeft <= 0 && !goalPauseActiveRef.current) {
                state.phase = 'finished'
                state.finishedAt = state.puTick
                setUiPhase('finished')
                saveGameResults()
                setShowOutro(true)
                const myT2 = joinInfoRef.current?.team
                const bw2 = state.score.blue > state.score.red, rw2 = state.score.red > state.score.blue
                const iWon2 = myT2 === 'blue' ? bw2 : myT2 === 'red' ? rw2 : false
                const isDraw2 = state.score.blue === state.score.red
                startIntroMusic(isDraw2 ? INTRO_MUSIC : iWon2 ? WINNER_MUSIC : LOSER_MUSIC)
                channelRef.current?.send({ type: 'broadcast', event: 'game_state', payload: { state: JSON.parse(JSON.stringify(state)) } })
              }
            }

            const phaseAfterStep = state.phase as Phase
            if ((phaseAfterStep === 'goal_pause' || phaseAfterStep === 'finished') && !goalPauseActiveRef.current) {
              goalPauseActiveRef.current = true
              setUiPhase(phaseAfterStep)
              if (phaseAfterStep === 'finished') {
                saveGameResults()
                setShowOutro(true)
                const s = physRef.current
                const myT = joinInfoRef.current?.team
                const bw = s ? s.score.blue > s.score.red : false
                const rw = s ? s.score.red > s.score.blue : false
                const iWon = myT === 'blue' ? bw : myT === 'red' ? rw : false
                const isDraw = s ? s.score.blue === s.score.red : false
                startIntroMusic(isDraw ? INTRO_MUSIC : iWon ? WINNER_MUSIC : LOSER_MUSIC)
              }
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

            if (broadcastTickRef.current % 3 === 0) {
              channelRef.current?.send({ type: 'broadcast', event: 'game_state', payload: { state: JSON.parse(JSON.stringify(state)) } })
            }
          }
          accumulator -= TICK_MS
        }
      }

      lastTime = now

      const state = physRef.current
      const ctx = canvasRef.current?.getContext('2d')
      if (state && ctx) draw(ctx, state, lobbyRef.current, sessionId, countdownRef.current, fpsRef.current, state.dribbling, joinInfoRef.current?.room.testMode ?? false)

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

      {/* Low FPS warning */}
      {lowFps && uiPhase !== 'lobby' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1e2e', border: '2px solid #ff4444', borderRadius: 16, padding: '32px 40px', maxWidth: 480, textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#ff6666' }}>Prestaties te laag</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 20, fontSize: 14 }}>
              Je browser draait onder de 50 FPS. Dit veroorzaakt haperingen.<br /><br />
              Controleer de volgende instellingen in Chrome:
            </p>
            <ol style={{ textAlign: 'left', color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 2, marginBottom: 20, paddingLeft: 20 }}>
              <li>Open <strong>chrome://settings/system</strong></li>
              <li>Zet <strong>"Grafische versnelling gebruiken"</strong> aan</li>
              <li>Herstart Chrome volledig</li>
              <li>Controleer je scherm-verversingssnelheid: minimaal <strong>60 Hz</strong></li>
            </ol>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>
              Fix de instellingen en herlaad de pagina om door te gaan.
            </p>
          </div>
        </div>
      )}

      {/* Intro transition — shown for all players when host clicks Start */}
      {showOutro && (() => {
        const s = physRef.current
        const myTeam = joinInfo?.team
        const blueWins = s ? s.score.blue > s.score.red : false
        const redWins = s ? s.score.red > s.score.blue : false
        const isDraw = s ? s.score.blue === s.score.red : false
        const iWon = myTeam === 'blue' ? blueWins : myTeam === 'red' ? redWins : false
        const result: 'winner' | 'loser' | 'draw' = isDraw ? 'draw' : iWon ? 'winner' : 'loser'
        return (
          <StickerbalTransition
            endData={{ result, score: s?.score ?? { blue: 0, red: 0 }, winTeam: blueWins ? 'blue' : 'red' }}
            onComplete={() => {
              stopIntroMusic()
              setShowOutro(false)
              votesRef.current = {}; setVotes({})
              setShowVoting(true)
              // Bots auto-vote yes
              for (const p of lobbyRef.current) {
                if (p.sessionId.startsWith('bot_')) {
                  setTimeout(() => handleVote(p.sessionId, 'yes'), 500 + Math.random() * 1000)
                }
              }
            }}
          />
        )
      })()}

      {showVoting && (
        <>
          <StickerbalBackground />
          <RematchVoting
            players={lobbyPlayers}
            mySessionId={sessionId}
            votes={votes}
            countdown={rematchCd}
            onVote={v => handleVote(sessionId, v)}
          />
        </>
      )}

      {showIntro && (
        <StickerbalTransition
          vsData={{
            blue: lobbyPlayers.filter(p => p.team === 'blue').map(p => p.displayName),
            red:  lobbyPlayers.filter(p => p.team === 'red').map(p => p.displayName),
          }}
          onComplete={() => {
            stopIntroMusic()
            setShowIntro(false)
            if (joinInfoRef.current?.isHost) handleStart()
          }}
        />
      )}

      {/* Lobby */}
      {uiPhase === 'lobby' && (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="card">
            {joinInfo?.room.testMode && (
              <div className="mb-3 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold flex items-center gap-1.5">
                🔧 Testmodus — scores worden niet opgeslagen
              </div>
            )}
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Spelcode</p>
            <p className="font-mono text-4xl font-black text-knvb-500 tracking-widest mb-2">{code}</p>
            <p className="text-xs text-gray-400 mb-4">
              {joinInfo.room.teamSize}v{joinInfo.room.teamSize} &nbsp;·&nbsp;
              eerste bij {joinInfo.room.maxGoals} doelpunten &nbsp;·&nbsp;
              max {joinInfo.room.maxMinutes} min
            </p>
            {joinInfo.isHost ? (
              <div className="space-y-2 mt-4">
                {lobbyPlayers.length < maxPlayers && (
                  <button onClick={handleAddBot}
                    className="w-full py-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-knvb-400 hover:text-knvb-500 text-sm font-medium transition-colors">
                    🤖 Bot toevoegen
                  </button>
                )}
                <button onClick={handleClickStart} disabled={!canStart}
                  className="w-full py-3 rounded-xl bg-oranje-500 hover:bg-oranje-600 text-white font-bold disabled:opacity-40 transition-colors">
                  {canStart ? '⚽ Start spel' : `Wachten op spelers (${lobbyPlayers.length}/${maxPlayers})`}
                </button>
              </div>
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
                  {p.sessionId.startsWith('bot_') && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">🤖 bot</span>}
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
