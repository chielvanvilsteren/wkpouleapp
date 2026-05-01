'use client'

import { useEffect, useRef } from 'react'

const RED   = '#AE1C28'
const WHITE = '#FFFFFF'
const BLUE  = '#21468B'

export default function WavingFlag({ width = 360, height = 240 }: { width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let t = 0

    // The flag image: draw to an offscreen canvas first
    const flag = document.createElement('canvas')
    flag.width = width
    flag.height = height
    const fctx = flag.getContext('2d')!

    const stripe = height / 3
    fctx.fillStyle = RED;   fctx.fillRect(0, 0,           width, stripe)
    fctx.fillStyle = WHITE; fctx.fillRect(0, stripe,      width, stripe)
    fctx.fillStyle = BLUE;  fctx.fillRect(0, stripe * 2,  width, stripe)

    function draw() {
      ctx!.clearRect(0, 0, width, height)

      const cols = width
      const wavelength = width * 0.7
      const maxAmp = height * 0.07  // subtle wave

      // Draw column by column with y-offset
      for (let x = 0; x < cols; x++) {
        // More amplitude toward the free end (right side)
        const progress = x / width
        const amp = progress * progress * maxAmp
        const yOff = Math.round(amp * Math.sin((x / wavelength) * Math.PI * 2 - t))

        // Draw a 1px column of the flag image shifted vertically
        ctx!.drawImage(flag, x, 0, 1, height, x, yOff, 1, height)
      }

      // Shadow at flagpole left edge
      const grad = ctx!.createLinearGradient(0, 0, 16, 0)
      grad.addColorStop(0, 'rgba(0,0,0,0.35)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx!.fillStyle = grad
      ctx!.fillRect(0, 0, 16, height)

      t += 0.04
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg shadow-2xl"
      style={{ display: 'block' }}
    />
  )
}
