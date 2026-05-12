'use client'

import { useState } from 'react'

interface Props {
  currentSpeed: number
}

const SPEED_LABELS: Record<number, string> = {
  0.5: 'Erg langzaam',
  0.75: 'Langzaam',
  1.0: 'Normaal',
  1.25: 'Snel',
  1.5: 'Erg snel',
  1.75: 'Turbo',
  2.0: 'Waanzinnig',
}

export default function AdminStickerbalSettings({ currentSpeed }: Props) {
  const [speed, setSpeed] = useState(currentSpeed)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true); setSaved(false)
    await fetch('/api/admin/stickerbal-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Spelsnelheid</label>
          <span className="text-sm font-bold text-knvb-600">{speed}× — {SPEED_LABELS[speed] ?? 'Aangepast'}</span>
        </div>
        <input
          type="range"
          min={0.5} max={2.0} step={0.25}
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="w-full accent-oranje-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0.5× langzaam</span>
          <span>1.0× normaal</span>
          <span>2.0× turbo</span>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Geldt voor nieuwe spelkamers. Lopende spellen worden niet beïnvloed.
      </p>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-oranje-500 hover:bg-oranje-600 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
      >
        {saving ? 'Opslaan…' : saved ? '✓ Opgeslagen' : 'Opslaan'}
      </button>
    </div>
  )
}
