"use client"

import { useEffect, useRef } from 'react'

interface Props {
  showText?: boolean
  onComplete?: () => void
}

export default function GameTransition({ showText = true, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

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

    let speed = 2
    let flashTriggered = false
    let rafId: number

    function animate() {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(0, 0, w, h)

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

        const kPrev = 128 / prevZ
        const pxPrev = s.x * kPrev + w / 2
        const pyPrev = s.y * kPrev + h / 2

        ctx.strokeStyle = 'rgba(255,140,30,0.85)'
        ctx.lineWidth = (1 - s.z / w) * 3
        ctx.beginPath()
        ctx.moveTo(pxPrev, pyPrev)
        ctx.lineTo(px, py)
        ctx.stroke()
      }

      if (speed < 30) speed += 0.15

      if (speed > 20 && !flashTriggered && flashRef.current) {
        flashRef.current.style.animation = 'gt-flash 1s ease-out forwards'
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
    if (!showText || !onComplete) return
    const timer = setTimeout(onComplete, 4500)
    return () => clearTimeout(timer)
  }, [showText, onComplete])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'black', overflow: 'hidden' }}>
      <style>{`
        @keyframes gt-text-in {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(-15deg); }
          60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1) rotate(-6deg); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(-8deg); }
        }
        @keyframes gt-flash {
          0%   { opacity: 0; transform: scale(0.2); }
          30%  { opacity: 1; }
          100% { opacity: 0; transform: scale(2.5); }
        }
        @keyframes gt-shake {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(-4px, 2px) scale(0.98); }
          50%  { transform: translate(2px, -1px); }
          75%  { transform: translate(-4px, 2px) scale(0.99); }
          100% { transform: translate(0, 0); }
        }
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

      <div
        ref={flashRef}
        style={{
          position: 'absolute',
          width: '200%',
          height: '200%',
          top: '-50%',
          left: '-50%',
          background: 'radial-gradient(circle, rgba(255,120,0,0.9) 0%, rgba(0,0,0,0) 70%)',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {showText && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) scale(0.6) rotate(-8deg)',
            textAlign: 'center',
            opacity: 0,
            animation: 'gt-text-in 2s ease-out forwards 2s',
            width: '90%',
            fontFamily: 'Impact, "Arial Black", sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(14px, 2vw, 22px)',
              color: '#ffb347',
              letterSpacing: '4px',
              marginBottom: '10px',
              fontFamily: '"Arial Black", sans-serif',
              fontWeight: 900,
            }}
          >
            WK POULE 2026
          </div>
          <div
            style={{
              fontSize: 'clamp(36px, 7vw, 80px)',
              fontWeight: 900,
              color: '#fff7ee',
              lineHeight: 1.1,
              textShadow:
                '0 0 10px #ff8c00, 0 0 30px #ff6600, 0 0 60px #ff4400, 2px 2px 0 black, 4px 4px 10px rgba(0,0,0,0.8)',
              animation: 'gt-shake 0.4s ease-in-out infinite',
            }}
          >
            BONUS GAME
          </div>
        </div>
      )}
    </div>
  )
}
