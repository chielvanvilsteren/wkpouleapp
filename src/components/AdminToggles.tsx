'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  inzendingen_open: boolean
  scores_zichtbaar: boolean
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (val: boolean) => void
  label: string
  description: string
  disabled: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div>
        <div className="font-semibold text-gray-800">{label}</div>
        <div className="text-sm text-gray-500 mt-0.5">{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-oranje-400 focus:ring-offset-2 disabled:opacity-50 ${
          checked ? 'bg-oranje-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
            checked ? 'translate-x-7' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function AdminToggles({ inzendingen_open, scores_zichtbaar }: Props) {
  const [inzendingenOpen, setInzendingenOpen] = useState(inzendingen_open)
  const [scoresZichtbaar, setScoresZichtbaar] = useState(scores_zichtbaar)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const save = async (field: 'inzendingen_open' | 'scores_zichtbaar', value: boolean) => {
    setSaving(true)
    setStatus('idle')

    const supabase = createClient()
    const { error } = await supabase
      .from('master_uitslag')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', 1)

    if (error) {
      setStatus('error')
      if (field === 'inzendingen_open') setInzendingenOpen(!value)
      else setScoresZichtbaar(!value)
    } else {
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <Toggle
        checked={inzendingenOpen}
        onChange={(val) => { setInzendingenOpen(val); save('inzendingen_open', val) }}
        label="Inzendingen open"
        description="Als aan: deelnemers kunnen hun voorspelling nog invullen of aanpassen."
        disabled={saving}
      />
      <Toggle
        checked={scoresZichtbaar}
        onChange={(val) => { setScoresZichtbaar(val); save('scores_zichtbaar', val) }}
        label="Scores zichtbaar"
        description="Als aan: iedereen kan de scores en ranglijst zien."
        disabled={saving}
      />
      {status === 'success' && (
        <p className="text-sm text-green-600 font-medium">✅ Instelling opgeslagen.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600">❌ Opslaan mislukt. Probeer opnieuw.</p>
      )}
    </div>
  )
}
