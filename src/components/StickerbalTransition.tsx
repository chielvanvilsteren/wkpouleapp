"use client"

import { useEffect, useRef } from 'react'

interface Props {
  onComplete?: () => void
  vsData?: { blue: string[]; red: string[] }
  endData?: { result: 'winner' | 'loser' | 'draw'; score: { blue: number; red: number }; winTeam?: 'blue' | 'red' }
}

export default function StickerbalTransition({ onComplete, vsData, endData }: Props) {
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

    let speed = 1.5
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

      if (speed < 32) speed += 0.1

      if (speed > 22 && !flashTriggered && flashRef.current) {
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
    const t = setTimeout(onComplete, 7000)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'black', overflow: 'hidden' }}>
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
        @keyframes mk-left {
          0%   { opacity: 0; transform: translateX(-120px) skewX(-8deg); }
          100% { opacity: 1; transform: translateX(0) skewX(-8deg); }
        }
        @keyframes mk-right {
          0%   { opacity: 0; transform: translateX(120px) skewX(8deg); }
          100% { opacity: 1; transform: translateX(0) skewX(8deg); }
        }
        @keyframes mk-vs {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(4); }
          60%  { opacity: 1; transform: translate(-50%,-50%) scale(0.9); }
          100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes mk-players {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes mk-result-slam {
          0%   { opacity: 0; transform: translateY(-220px) scale(2.2); }
          65%  { opacity: 1; transform: translateY(12px) scale(0.93); }
          80%  { transform: translateY(-6px) scale(1.04); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes winner-pulse {
          0%, 100% { text-shadow: 0 0 20px #ff8800, 0 0 50px #ff4400, 4px 4px 0 #000; }
          50%      { text-shadow: 0 0 50px #ffcc00, 0 0 100px #ff8800, 4px 4px 0 #000; }
        }
        @keyframes mk-score-in {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes mk-result-shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

      {/* Blue flash */}
      <div
        ref={flashRef}
        style={{
          position: 'absolute', width: '200%', height: '200%', top: '-50%', left: '-50%',
          background: 'radial-gradient(circle, rgba(60,140,255,0.85) 0%, rgba(0,0,0,0) 70%)',
          opacity: 0, pointerEvents: 'none',
        }}
      />

      {endData ? (
        /* ── WINNER / LOSER outro ── */
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Impact, "Arial Black", sans-serif' }}>

          {/* Result text */}
          <div style={{
            animation: 'mk-result-slam 0.55s cubic-bezier(.17,.67,.35,1.2) forwards 2s, mk-result-shake 0.3s ease-out forwards 2.58s',
            opacity: 0,
            textAlign: 'center',
          }}>
            {endData.result === 'winner' && (
              <div style={{
                fontSize: 'clamp(64px, 12vw, 130px)',
                fontWeight: 900,
                color: '#FFD700',
                lineHeight: 1,
                letterSpacing: '-2px',
                animation: 'mk-result-slam 0.55s cubic-bezier(.17,.67,.35,1.2) forwards 2s, winner-pulse 1.2s ease-in-out infinite 2.6s',
                opacity: 0,
                textShadow: '0 0 20px #ff8800, 0 0 50px #ff4400, 4px 4px 0 #000, 6px 6px 20px rgba(0,0,0,0.9)',
              }}>WINNER!</div>
            )}
            {endData.result === 'loser' && (
              <div style={{
                fontSize: 'clamp(64px, 12vw, 130px)',
                fontWeight: 900,
                color: '#cc1111',
                lineHeight: 1,
                letterSpacing: '-2px',
                animation: 'mk-result-slam 0.55s cubic-bezier(.17,.67,.35,1.2) forwards 2s',
                opacity: 0,
                textShadow: '0 0 15px #660000, 0 0 30px #440000, 4px 4px 0 #000, 6px 6px 20px rgba(0,0,0,0.9)',
              }}>LOSER!</div>
            )}
            {endData.result === 'draw' && (
              <div style={{
                fontSize: 'clamp(64px, 12vw, 130px)',
                fontWeight: 900,
                color: '#aaaaaa',
                lineHeight: 1,
                letterSpacing: '-2px',
                animation: 'mk-result-slam 0.55s cubic-bezier(.17,.67,.35,1.2) forwards 2s',
                opacity: 0,
                textShadow: '0 0 10px #555, 4px 4px 0 #000',
              }}>DRAW!</div>
            )}
          </div>

          {/* Score */}
          <div style={{
            fontSize: 'clamp(28px, 5vw, 52px)',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.9)',
            fontFamily: 'monospace',
            marginTop: '20px',
            letterSpacing: '6px',
            textShadow: '2px 2px 0 #000',
            animation: 'mk-score-in 0.4s ease-out forwards 3.2s',
            opacity: 0,
          }}>
            {endData.score.red} — {endData.score.blue}
          </div>

          {/* Sub-label */}
          <div style={{
            fontSize: 'clamp(12px, 1.8vw, 18px)',
            color: endData.result === 'winner' ? '#ffaa44' : endData.result === 'loser' ? '#ff4444' : '#888888',
            letterSpacing: '4px',
            marginTop: '12px',
            fontFamily: '"Arial Black", Arial, sans-serif',
            animation: 'mk-score-in 0.4s ease-out forwards 3.6s',
            opacity: 0,
          }}>
            {endData.result === 'winner' ? 'UITSTEKEND GESPEELD' : endData.result === 'loser' ? 'BETER GELUK VOLGENDE KEER' : 'EVENWICHTIG SPEL'}
          </div>
        </div>
      ) : vsData ? (
        /* ── Mortal Kombat VS screen ── */
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Divider line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: 'rgba(255,255,255,0.08)' }} />

          {/* BLUE side */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '45%',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
            paddingRight: '6%', fontFamily: 'Impact, "Arial Black", sans-serif',
            animation: 'mk-left 0.6s cubic-bezier(.17,.67,.35,1.2) forwards 2.2s',
            opacity: 0,
          }}>
            <div style={{ fontSize: 'clamp(10px, 1.4vw, 16px)', color: '#88aaff', letterSpacing: '4px', marginBottom: 4 }}>TEAM</div>
            <div style={{
              fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1,
              color: '#4488ff',
              textShadow: '0 0 20px #2255cc, 0 0 50px #1133aa, 3px 3px 0 #000, 5px 5px 12px rgba(0,0,0,0.9)',
              letterSpacing: '-1px',
            }}>BLUE</div>
            <div style={{
              marginTop: 14, textAlign: 'right',
              animation: 'mk-players 0.4s ease-out forwards 3.2s', opacity: 0,
            }}>
              {vsData.blue.map(n => (
                <div key={n} style={{ fontSize: 'clamp(13px, 1.6vw, 18px)', color: 'rgba(180,210,255,0.85)', fontFamily: 'Arial, sans-serif', fontWeight: 700, letterSpacing: '2px', lineHeight: 1.5 }}>{n.toUpperCase()}</div>
              ))}
            </div>
          </div>

          {/* VS */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 'clamp(40px, 8vw, 96px)',
            fontWeight: 900,
            color: '#ffdd00',
            textShadow: '0 0 15px #ff8800, 0 0 40px #ff4400, 3px 3px 0 #000, 6px 6px 15px rgba(0,0,0,0.9)',
            animation: 'mk-vs 0.5s cubic-bezier(.17,.67,.35,1.2) forwards 3s',
            opacity: 0,
            letterSpacing: '-2px',
            zIndex: 1,
          }}>VS</div>

          {/* ORANGE side */}
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center',
            paddingLeft: '6%', fontFamily: 'Impact, "Arial Black", sans-serif',
            animation: 'mk-right 0.6s cubic-bezier(.17,.67,.35,1.2) forwards 2.2s',
            opacity: 0,
          }}>
            <div style={{ fontSize: 'clamp(10px, 1.4vw, 16px)', color: '#ffaa55', letterSpacing: '4px', marginBottom: 4 }}>TEAM</div>
            <div style={{
              fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1,
              color: '#FF6200',
              textShadow: '0 0 20px #cc3300, 0 0 50px #aa2200, 3px 3px 0 #000, 5px 5px 12px rgba(0,0,0,0.9)',
              letterSpacing: '-1px',
            }}>ORANGE</div>
            <div style={{
              marginTop: 14, textAlign: 'left',
              animation: 'mk-players 0.4s ease-out forwards 3.2s', opacity: 0,
            }}>
              {vsData.red.map(n => (
                <div key={n} style={{ fontSize: 'clamp(13px, 1.6vw, 18px)', color: 'rgba(255,200,150,0.85)', fontFamily: 'Arial, sans-serif', fontWeight: 700, letterSpacing: '2px', lineHeight: 1.5 }}>{n.toUpperCase()}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Default STICKERBAL text ── */
        <div
          ref={textRef}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%) scale(0.6) rotate(5deg)',
            textAlign: 'center', opacity: 0,
            animation: 'stb-text-in 2s ease-out forwards 3s',
            width: '90%', fontFamily: 'Impact, "Arial Black", sans-serif',
          }}
        >
          <div style={{ fontSize: 'clamp(12px, 1.8vw, 20px)', color: '#88ccff', letterSpacing: '5px', marginBottom: '8px', fontWeight: 900 }}>
            WK POULE 2026
          </div>
          <div style={{
            fontSize: 'clamp(32px, 6.5vw, 74px)', fontWeight: 900, color: '#e8f4ff', lineHeight: 1.1,
            textShadow: '0 0 10px #3399ff, 0 0 30px #2277ee, 0 0 60px #1155cc, 2px 2px 0 black, 4px 4px 10px rgba(0,0,0,0.8)',
            animation: 'stb-shake 0.4s ease-in-out infinite',
          }}>STICKERBAL</div>
          <div style={{ fontSize: 'clamp(28px, 5vw, 60px)', animation: 'stb-ball 0.6s ease-in-out infinite', display: 'inline-block', marginTop: '8px' }}>⚽</div>
        </div>
      )}
    </div>
  )
}
