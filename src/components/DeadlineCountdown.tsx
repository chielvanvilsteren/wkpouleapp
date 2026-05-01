'use client'

import { useEffect, useState } from 'react'

type Time = { days: number; hours: number; minutes: number; seconds: number }

function calc(target: Date): Time {
  const diff = Math.max(0, target.getTime() - Date.now())
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 min-w-[56px] text-center">
        <span className="text-2xl md:text-3xl font-black text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-white/60 text-xs mt-1 uppercase tracking-widest">{label}</span>
    </div>
  )
}

export default function DeadlineCountdown({ deadlineIso, label }: { deadlineIso: string; label?: string }) {
  const target = new Date(deadlineIso)
  const [time, setTime] = useState<Time | null>(null)

  useEffect(() => {
    setTime(calc(target))
    const id = setInterval(() => setTime(calc(target)), 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineIso])

  if (!time) return null

  const expired = time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0

  if (expired) {
    return (
      <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
        <span>⛔</span>
        <span>Deadline verstreken — inzendingen gesloten.</span>
      </div>
    )
  }

  const dateLabel = target.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-white/70 text-sm uppercase tracking-widest">
        {label ?? 'Deadline'}: {dateLabel} om 23:59 — nog
      </p>
      <div className="flex gap-2">
        {time.days > 0 && <Digit value={time.days} label="dagen" />}
        <Digit value={time.hours}   label="uur" />
        <Digit value={time.minutes} label="min" />
        <Digit value={time.seconds} label="sec" />
      </div>
    </div>
  )
}
