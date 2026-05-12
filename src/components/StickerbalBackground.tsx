"use client"

import { useEffect, useRef } from 'react'

export default function StickerbalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)

    const stars = Array.from({ length: 800 }, () => ({
      x: (Math.random() - 0.5) * w,
      y: (Math.random() - 0.5) * h,
      z: Math.random() * w,
    }))

    let rafId: number
    const SPEED = 2.2

    const loop = () => {
      ctx.fillStyle = 'rgba(3,6,28,0.12)'
      ctx.fillRect(0, 0, w, h)

      for (const s of stars) {
        const prevZ = s.z
        s.z -= SPEED
        if (s.z <= 0) { s.x = (Math.random() - 0.5) * w; s.y = (Math.random() - 0.5) * h; s.z = w }

        const k = 128 / s.z
        const px = s.x * k + w / 2, py = s.y * k + h / 2
        const kP = 128 / prevZ
        const pxP = s.x * kP + w / 2, pyP = s.y * kP + h / 2

        const brightness = 1 - s.z / w
        ctx.strokeStyle = `rgba(100,180,255,${0.2 + brightness * 0.8})`
        ctx.lineWidth = brightness * 4
        ctx.beginPath(); ctx.moveTo(pxP, pyP); ctx.lineTo(px, py); ctx.stroke()
      }

      rafId = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9997, background: 'linear-gradient(135deg, #060d30 0%, #0a1845 50%, #060d30 100%)', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
