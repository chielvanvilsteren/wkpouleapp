'use client'

import { useEffect } from 'react'

interface Props {
  onComplete: () => void
}

export default function FlappyS2Intro({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 4200)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden', cursor: 'pointer' }}
      onClick={onComplete}
    >
      <style>{`
        @keyframes fb2-ball {
          0%   { transform: translateY(-90px) rotate(-30deg) scale(1.5); opacity: 0 }
          55%  { transform: translateY(8px) rotate(8deg) scale(0.9); opacity: 1 }
          72%  { transform: translateY(-4px) rotate(-3deg) scale(1.06) }
          100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1 }
        }
        @keyframes fb2-title {
          0%   { transform: translateY(-50px) scale(1.15); opacity: 0; filter: blur(6px) }
          55%  { transform: translateY(5px) scale(0.97); opacity: 1; filter: blur(0) }
          100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0) }
        }
        @keyframes fb2-divider {
          0%   { transform: scaleX(0); opacity: 0 }
          100% { transform: scaleX(1); opacity: 1 }
        }
        @keyframes fb2-seizoen {
          0%   { transform: translateX(-180px) skewX(-6deg); opacity: 0 }
          60%  { transform: translateX(8px) skewX(-6deg); opacity: 1 }
          100% { transform: translateX(0) skewX(0); opacity: 1 }
        }
        @keyframes fb2-two {
          0%   { transform: translateY(-160px) scale(2.2); opacity: 0 }
          50%  { transform: translateY(12px) scale(0.86); opacity: 1 }
          68%  { transform: translateY(-6px) scale(1.08) }
          82%  { transform: translateY(3px) scale(0.97) }
          100% { transform: translateY(0) scale(1); opacity: 1 }
        }
        @keyframes fb2-flash {
          0%   { opacity: 0 }
          12%  { opacity: 0.55 }
          100% { opacity: 0 }
        }
        @keyframes fb2-sub {
          0%   { opacity: 0; transform: translateY(14px) }
          100% { opacity: 1; transform: translateY(0) }
        }
        @keyframes fb2-tap {
          0%, 100% { opacity: 0.2 }
          50%      { opacity: 0.65 }
        }
        @keyframes fb2-glow-title {
          0%, 100% { text-shadow: 0 2px 0 #000, 0 0 24px rgba(249,115,22,0.4) }
          50%      { text-shadow: 0 2px 0 #000, 0 0 60px rgba(249,115,22,0.8), 0 0 100px rgba(234,88,12,0.35) }
        }
        @keyframes fb2-glow-two {
          0%, 100% { text-shadow: 0 4px 0 #7c2d12, 0 0 30px rgba(249,115,22,0.5) }
          50%      { text-shadow: 0 4px 0 #7c2d12, 0 0 80px rgba(249,115,22,1), 0 0 140px rgba(234,88,12,0.5) }
        }
      `}</style>

      {/* Flash op "2" impact */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgb(249,115,22)',
          pointerEvents: 'none',
          animation: 'fb2-flash 0.5s ease-out 1.62s both',
        }}
      />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '4px', userSelect: 'none', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '4px', animation: 'fb2-ball 0.65s cubic-bezier(0.22,1,0.36,1) 0.15s both' }}>
          ⚽
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em',
          color: 'white', margin: 0,
          animation: 'fb2-title 0.6s cubic-bezier(0.22,1,0.36,1) 0.45s both, fb2-glow-title 2s ease-in-out 1.4s infinite',
        }}>
          FLAPPY BAL
        </h1>

        <div style={{
          width: '160px', height: '1px', background: 'rgba(255,255,255,0.25)',
          margin: '8px 0', animation: 'fb2-divider 0.35s ease-out 1.05s both',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
          <span style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', fontWeight: 900,
            color: 'rgba(255,255,255,0.8)', letterSpacing: '0.2em', textTransform: 'uppercase',
            paddingBottom: '8px', animation: 'fb2-seizoen 0.55s cubic-bezier(0.22,1,0.36,1) 1.15s both',
          }}>
            Seizoen
          </span>
          <span style={{
            fontSize: 'clamp(4rem, 10vw, 6rem)', fontWeight: 900, color: 'rgb(249,115,22)', lineHeight: 1,
            animation: 'fb2-two 0.65s cubic-bezier(0.34,1.2,0.64,1) 1.58s both, fb2-glow-two 1.4s ease-in-out 2.4s infinite',
          }}>
            2
          </span>
        </div>

        <p style={{
          color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem',
          letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: '8px',
          animation: 'fb2-sub 0.5s ease-out 2.3s both',
        }}>
          WK 2026
        </p>

        <p style={{
          color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', marginTop: '20px',
          animation: 'fb2-tap 1.3s ease-in-out 2.9s infinite',
        }}>
          Tik om te beginnen
        </p>
      </div>
    </div>
  )
}
