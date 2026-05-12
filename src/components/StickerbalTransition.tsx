"use client"

import { useEffect, useRef } from 'react'

interface Props {
  onComplete?: () => void
}

export default function StickerbalTransition({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const handleResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const stars = Array.from({ length: 1200 }, () => ({
      x: (Math.random() - 0.5) * w,
      y: (Math.random() - 0.5) * h,
      z: Math.random() * w,
    }))

    // Lightning bolts
    const bolts: { x: number; y: number; life: number }[] = []

    let speed = 2
    let flashTriggered = false
    let rafId: number
    let frame = 0

    function drawLightning(x1: number, y1: number, x2: number, y2: number, branches: number) {
      if (branches <= 0) return
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 40
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 40
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(mx, my)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      if (Math.random() < 0.4) drawLightning(mx, my, mx + (Math.random() - 0.5) * 80, my + Math.random() * 60, branches - 1)
    }

    function animate() {
      frame++
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.fillRect(0, 0, w, h)

      // Stars (blue)
      for (const s of stars) {
        const prevZ = s.z
        s.z -= speed
        if (s.z <= 0) {
          s.x = (Math.random() - 0.5) * w
          s.y = (Math.random() - 0.5) * h
          s.z = w
        }
        const k = 128 / s.z
        const px = s.x * k + w / 2
        const py = s.y * k + h / 2
        const kP = 128 / prevZ
        const pxP = s.x * kP + w / 2
        const pyP = s.y * kP + h / 2
        ctx.strokeStyle = `rgba(60,160,255,${0.6 + (1 - s.z / w) * 0.4})`
        ctx.lineWidth = (1 - s.z / w) * 3
        ctx.beginPath()
        ctx.moveTo(pxP, pyP)
        ctx.lineTo(px, py)
        ctx.stroke()
      }

      // Occasional lightning when going fast
      if (speed > 12 && frame % 8 === 0) {
        ctx.strokeStyle = 'rgba(140,200,255,0.7)'
        ctx.lineWidth = 1.5
        ctx.shadowBlur = 8
        ctx.shadowColor = '#88ccff'
        const lx = Math.random() * w
        drawLightning(lx, 0, lx + (Math.random() - 0.5) * 100, h, 3)
        ctx.shadowBlur = 0
      }

      if (speed < 30) speed += 0.15

      if (speed > 20 && !flashTriggered && flashRef.current) {
        flashRef.current.style.animation = 'stb-flash 1s ease-out forwards'
        flashTriggered = true
      }

      rafId = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!onComplete) return
    const t = setTimeout(onComplete, 4500)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'black', overflow: 'hidden' }}>
      <style>{`
        @keyframes stb-text-in {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(8deg); }
          60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1) rotate(3deg); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(5deg); }
        }
        @keyframes stb-flash {
          0%   { opacity: 0; transform: scale(0.2); }
          30%  { opacity: 1; }
          100% { opacity: 0; transform: scale(2.5); }
        }
        @keyframes stb-shake {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(-3px, 2px) scale(0.98); }
          50%  { transform: translate(4px, -2px); }
          75%  { transform: translate(-3px, 1px) scale(0.99); }
          100% { transform: translate(0, 0); }
        }
        @keyframes stb-ball {
          0%   { transform: translateY(0) rotate(0deg); }
          50%  { transform: translateY(-18px) rotate(180deg); }
          100% { transform: translateY(0) rotate(360deg); }
        }
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

      {/* Blue flash */}
      <div
        ref={flashRef}
        style={{
          position: 'absolute',
          width: '200%',
          height: '200%',
          top: '-50%',
          left: '-50%',
          background: 'radial-gradient(circle, rgba(60,140,255,0.85) 0%, rgba(0,0,0,0) 70%)',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Text */}
      <div
        ref={textRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0.6) rotate(5deg)',
          textAlign: 'center',
          opacity: 0,
          animation: 'stb-text-in 2s ease-out forwards 2s',
          width: '90%',
          fontFamily: 'Impact, "Arial Black", sans-serif',
        }}
      >
        <div style={{
          fontSize: 'clamp(12px, 1.8vw, 20px)',
          color: '#88ccff',
          letterSpacing: '5px',
          marginBottom: '8px',
          fontWeight: 900,
        }}>
          WK POULE 2026
        </div>
        <div style={{
          fontSize: 'clamp(32px, 6.5vw, 74px)',
          fontWeight: 900,
          color: '#e8f4ff',
          lineHeight: 1.1,
          textShadow: '0 0 10px #3399ff, 0 0 30px #2277ee, 0 0 60px #1155cc, 2px 2px 0 black, 4px 4px 10px rgba(0,0,0,0.8)',
          animation: 'stb-shake 0.4s ease-in-out infinite',
        }}>
          STICKERBAL
        </div>
        <div style={{
          fontSize: 'clamp(28px, 5vw, 60px)',
          animation: 'stb-ball 0.6s ease-in-out infinite',
          display: 'inline-block',
          marginTop: '8px',
        }}>
          ⚽
        </div>
      </div>
    </div>
  )
}
