'use client'

import { useEffect, useRef } from 'react'

export default function FlappyBgCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W
    canvas.height = H

    const ctx = canvas.getContext('2d')!

    // ── Types ────────────────────────────────────────────────────
    type Particle = {
      x: number; y: number; vx: number; vy: number
      life: number; decay: number; size: number
      r: number; g: number; b: number
    }

    type Rocket = {
      x: number; y: number; vy: number; vx: number
      trail: { x: number; y: number }[]
      exploded: boolean
      targetY: number
    }

    // ── State ────────────────────────────────────────────────────
    const particles: Particle[] = []
    const rockets: Rocket[] = []

    const COLORS = [
      [249, 115, 22],  // orange
      [251, 191, 36],  // gold
      [255, 255, 255], // white
      [234, 88,  12],  // dark orange
      [253, 224, 71],  // yellow
    ]

    function explode(x: number, y: number) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      const count = 55 + Math.floor(Math.random() * 30)
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2
        const speed = 1.5 + Math.random() * 4.5
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.012 + Math.random() * 0.018,
          size: 1.2 + Math.random() * 2.5,
          r: color[0], g: color[1], b: color[2],
        })
      }
    }

    function spawnRocket() {
      // Left side or right side, avoiding center modal area
      const side = Math.random() < 0.5 ? 'left' : 'right'
      const margin = W * 0.08
      const sideW = W * 0.28
      const x = side === 'left'
        ? margin + Math.random() * sideW
        : W - margin - Math.random() * sideW
      rockets.push({
        x, y: H + 10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(7 + Math.random() * 5),
        trail: [],
        exploded: false,
        targetY: H * (0.12 + Math.random() * 0.35),
      })
    }

    // ── Initial center burst ─────────────────────────────────────
    function spawnCenterBurst(n: number, speed: number) {
      const color = COLORS[0]
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.3
        const s = speed * (0.4 + Math.random() * 0.9)
        particles.push({
          x: W / 2, y: H / 2,
          vx: Math.cos(angle) * s, vy: Math.sin(angle) * s,
          life: 1, decay: 0.008 + Math.random() * 0.012,
          size: 1.5 + Math.random() * 3,
          r: color[0], g: color[1], b: color[2],
        })
      }
    }

    spawnCenterBurst(160, 5)
    let frame = 0
    let burstDone = false
    let nextRocket = 80 // first side rocket after ~1.3s

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.5 + 0.1,
      twink: Math.random() * Math.PI * 2,
    }))

    let raf: number

    ctx.fillStyle = 'rgb(5,10,20)'
    ctx.fillRect(0, 0, W, H)

    function draw() {
      frame++

      // Background fade
      ctx.fillStyle = frame < 8
        ? `rgba(5,10,20,${0.6 + frame * 0.05})`
        : 'rgba(5,10,20,0.22)'
      ctx.fillRect(0, 0, W, H)

      // Center glow
      const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.55)
      const pulse = 0.05 + 0.03 * Math.sin(frame * 0.04)
      glow.addColorStop(0, `rgba(249,115,22,${pulse})`)
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      // Stars
      for (const s of stars) {
        const a = s.a * (0.6 + 0.4 * Math.sin(s.twink + frame * 0.025))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
      }

      // Center trickle
      if (frame % 4 === 0) {
        const angle = Math.random() * Math.PI * 2
        const s = 0.6 + Math.random() * 2
        const c = COLORS[0]
        particles.push({
          x: W / 2 + (Math.random() - 0.5) * 60,
          y: H / 2 + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * s, vy: Math.sin(angle) * s - 0.4,
          life: 1, decay: 0.016 + Math.random() * 0.01,
          size: 1 + Math.random() * 2,
          r: c[0], g: c[1], b: c[2],
        })
      }

      // Second center burst
      if (frame === 96 && !burstDone) {
        burstDone = true
        spawnCenterBurst(200, 9)
      }

      // Spawn side rockets periodically
      if (frame >= nextRocket) {
        spawnRocket()
        nextRocket = frame + 90 + Math.floor(Math.random() * 60)
      }

      // Update rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]
        if (r.exploded) { rockets.splice(i, 1); continue }

        r.trail.push({ x: r.x, y: r.y })
        if (r.trail.length > 12) r.trail.shift()

        r.x += r.vx
        r.y += r.vy
        r.vy += 0.12 // slight drag

        // Draw trail
        for (let t = 0; t < r.trail.length; t++) {
          const a = (t / r.trail.length) * 0.7
          ctx.beginPath()
          ctx.arc(r.trail[t].x, r.trail[t].y, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,200,80,${a})`
          ctx.fill()
        }

        // Draw rocket head
        ctx.beginPath()
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,230,100,0.9)'
        ctx.fill()

        // Explode at target height or when decelerating
        if (r.y <= r.targetY || r.vy >= -1.5) {
          r.exploded = true
          explode(r.x, r.y)
        }
      }

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.04
        p.vx *= 0.98
        p.life -= p.decay
        if (p.life <= 0) { particles.splice(i, 1); continue }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.life * 0.85})`
        ctx.fill()
      }

      // Scanlines
      if (frame % 2 === 0) {
        for (let y = 0; y < H; y += 4) {
          ctx.fillStyle = 'rgba(0,0,0,0.05)'
          ctx.fillRect(0, y, W, 1)
        }
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
