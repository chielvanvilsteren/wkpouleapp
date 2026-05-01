'use client'

import { useEffect, useState } from 'react'

// NL vs Japan: June 14, 2026
const TARGET = new Date('2026-06-14T00:00:00')

type Time = { days: number; hours: number; minutes: number; seconds: number }

function calc(): Time {
  const diff = Math.max(0, TARGET.getTime() - Date.now())
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000)  / 60000),
    seconds: Math.floor((diff % 60000)    / 1000),
  }
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 min-w-[64px] text-center">
        <span className="text-3xl md:text-4xl font-black text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-white/60 text-xs mt-1 uppercase tracking-widest">{label}</span>
    </div>
  )
}

export default function CountdownTimer() {
  const [time, setTime] = useState<Time>(calc())
  const [started, setStarted] = useState(false)

  useEffect(() => {
    setStarted(true)
    const id = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!started) return null

  if (time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0) {
    return (
      <div className="text-center text-white font-bold text-2xl animate-pulse">
        🟠 Het WK is begonnen!
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-white/70 text-sm uppercase tracking-widest">Nederland vs Japan over</p>
      <div className="flex gap-3">
        <Digit value={time.days}    label="dagen" />
        <Digit value={time.hours}   label="uur" />
        <Digit value={time.minutes} label="min" />
        <Digit value={time.seconds} label="sec" />
      </div>
    </div>
  )
}
