"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface PlusFlash {
  row: number
  col: number
  startedAt: number
}

const FLASH_DURATION = 1000
// White crosses in the SVG tile are at (5,5), (35,5), (5,35), (35,35) in a 60x60 tile
// → grid spacing 30px, offset 5px
const SPACING = 30
const OFFSET = 5
const HIT_RADIUS = 6 // px from center counts as a hit

function crossPos(col: number, row: number) {
  return { x: OFFSET + col * SPACING, y: OFFSET + row * SPACING }
}

function nearestCross(px: number, py: number) {
  const col = Math.round((px - OFFSET) / SPACING)
  const row = Math.round((py - OFFSET) / SPACING)
  const { x, y } = crossPos(col, row)
  return { col, row, dx: px - x, dy: py - y }
}

interface Props {
  onTripleClick: () => void
}

export default function HeroPlusGrid({ onTripleClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [flashes, setFlashes] = useState<PlusFlash[]>([])
  const [clicked, setClicked] = useState<Set<string>>(new Set())
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null)
  const clickCountRef = useRef(0)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up expired flashes
  useEffect(() => {
    if (flashes.length === 0) return
    const oldest = Math.min(...flashes.map((f) => f.startedAt))
    const delay = FLASH_DURATION - (Date.now() - oldest) + 50
    const id = setTimeout(() => {
      const now = Date.now()
      setFlashes((prev) => prev.filter((f) => now - f.startedAt < FLASH_DURATION))
    }, delay)
    return () => clearTimeout(id)
  }, [flashes])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const { col, row, dx, dy } = nearestCross(x, y)

      if (Math.abs(dx) > HIT_RADIUS || Math.abs(dy) > HIT_RADIUS) return

      const key = `${row},${col}`
      if (clicked.has(key)) return

      setClicked((prev) => new Set(prev).add(key))
      setFlashes((prev) => [
        ...prev.filter((f) => !(f.row === row && f.col === col)),
        { row, col, startedAt: Date.now() },
      ])

      clickCountRef.current += 1
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)

      if (clickCountRef.current >= 3) {
        clickCountRef.current = 0
        onTripleClick()
      } else {
        resetTimerRef.current = setTimeout(() => { clickCountRef.current = 0 }, 3000)
      }
    },
    [onTripleClick, clicked]
  )

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const { col, row, dx, dy } = nearestCross(x, y)
    const key = `${row},${col}`
    if (Math.abs(dx) <= HIT_RADIUS && Math.abs(dy) <= HIT_RADIUS && !clicked.has(key)) {
      setHovered({ row, col })
    } else {
      setHovered(null)
    }
  }, [clicked])

  const handleMouseLeave = useCallback(() => setHovered(null), [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ zIndex: 1, cursor: hovered ? 'pointer' : 'default' }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Static plus grid via CSS */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          opacity: 0.05,
        }}
      />

      {/* Permanently clicked crosses */}
      {Array.from(clicked).map((key) => {
        const [r, c] = key.split(',').map(Number)
        const { x, y } = crossPos(c, r)
        return (
          <PlusMark key={key} x={x} y={y} opacity={1} glow fade />
        )
      })}

      {/* Hover highlight */}
      {hovered && (() => {
        const { x, y } = crossPos(hovered.col, hovered.row)
        return <PlusMark x={x} y={y} opacity={0.6} />
      })()}

      {/* Flash animations */}
      {flashes.map((f) => {
        const { x, y } = crossPos(f.col, f.row)
        return <FlashPlus key={`${f.row}-${f.col}-${f.startedAt}`} x={x} y={y} />
      })}
    </div>
  )
}

function PlusMark({ x, y, opacity, glow, fade }: { x: number; y: number; opacity: number; glow?: boolean; fade?: boolean }) {
  const elRef = useRef<HTMLDivElement>(null)
  const shadow = glow ? '0 0 6px #FF6200, 0 0 12px #FF6200' : undefined

  useEffect(() => {
    if (!fade) return
    const el = elRef.current
    if (!el) return
    el.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 2000, delay: 200, easing: 'ease-out', fill: 'forwards' }
    )
  }, [fade])

  return (
    <div ref={elRef} className="absolute pointer-events-none" style={{ left: x - 5, top: y - 5, width: 10, height: 10 }}>
      <div className="absolute" style={{ left: 0, top: 4, width: 10, height: 2, background: '#FF6200', borderRadius: 1, opacity, boxShadow: shadow }} />
      <div className="absolute" style={{ left: 4, top: 0, width: 2, height: 10, background: '#FF6200', borderRadius: 1, opacity, boxShadow: shadow }} />
    </div>
  )
}

function FlashPlus({ x, y }: { x: number; y: number }) {
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    el.animate(
      [
        { opacity: 1, transform: "scale(2)" },
        { opacity: 0.6, transform: "scale(1.5)", offset: 0.2 },
        { opacity: 0, transform: "scale(1)" },
      ],
      { duration: FLASH_DURATION, easing: "ease-out", fill: "forwards" }
    )
  }, [])

  return (
    <div ref={elRef} className="absolute pointer-events-none" style={{ left: x - 5, top: y - 5, width: 10, height: 10 }}>
      <div className="absolute" style={{ left: 0, top: 4, width: 10, height: 2, background: '#FF6200', borderRadius: 1, boxShadow: '0 0 8px #FF6200, 0 0 16px #FF6200' }} />
      <div className="absolute" style={{ left: 4, top: 0, width: 2, height: 10, background: '#FF6200', borderRadius: 1, boxShadow: '0 0 8px #FF6200, 0 0 16px #FF6200' }} />
    </div>
  )
}
