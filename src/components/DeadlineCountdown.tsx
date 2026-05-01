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

export default function DeadlineCountdown({ deadlineIso }: { deadlineIso: string }) {
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
  const pad = (n: number) => String(n).padStart(2, '0')

  const dateLabel = target.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })

  if (expired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-red-500 text-lg">⛔</span>
        <span className="text-red-700 font-semibold text-sm">Deadline verstreken — inzendingen zijn gesloten.</span>
      </div>
    )
  }

  return (
    <div className="bg-knvb-50 border border-knvb-100 rounded-xl px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="text-sm text-knvb-700 font-medium">
          ⏳ Deadline: <span className="font-semibold">{dateLabel} om 23:59</span>
        </div>
        <div className="flex items-center gap-2 text-knvb-900">
          {time.days > 0 && (
            <span className="text-sm font-bold">{time.days}d</span>
          )}
          <span className="font-mono font-bold text-lg tabular-nums">
            {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
          </span>
          <span className="text-xs text-knvb-500">resterend</span>
        </div>
      </div>
    </div>
  )
}
