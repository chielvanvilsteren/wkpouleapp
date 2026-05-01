'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  inzendingen_open: boolean
  inzendingen_deadline: string | null
  scores_zichtbaar: boolean
  wk_poule_open: boolean
  wk_scores_zichtbaar: boolean
}

function Toggle({
  checked, onChange, label, description, disabled,
}: {
  checked: boolean; onChange: (val: boolean) => void; label: string; description: string; disabled: boolean
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
        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-oranje-400 focus:ring-offset-2 disabled:opacity-50 ${checked ? 'bg-oranje-500' : 'bg-gray-300'}`}
      >
        <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${checked ? 'translate-x-7' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

// Extract local date string (YYYY-MM-DD) from UTC ISO for <input type="date">
function toDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function AdminToggles({ inzendingen_open, inzendingen_deadline, scores_zichtbaar, wk_poule_open, wk_scores_zichtbaar }: Props) {
  const [inzendingenOpen, setInzendingenOpen] = useState(inzendingen_open)
  const [deadline, setDeadline] = useState(toDateInput(inzendingen_deadline))
  const [scoresZichtbaar, setScoresZichtbaar] = useState(scores_zichtbaar)
  const [wkPouleOpen, setWkPouleOpen] = useState(wk_poule_open)
  const [wkScoresZichtbaar, setWkScoresZichtbaar] = useState(wk_scores_zichtbaar)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const save = async (fields: Record<string, unknown>, revert?: () => void) => {
    setSaving(true)
    setStatus('idle')
    const supabase = createClient()
    const { error } = await supabase
      .from('master_uitslag')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', 1)

    if (error) { setStatus('error'); revert?.() }
    else { setStatus('success'); setTimeout(() => setStatus('idle'), 3000) }
    setSaving(false)
  }

  const saveDeadline = async (value: string) => {
    setDeadline(value)
    // Store as end-of-day (23:59:59) in local time
    const iso = value ? new Date(`${value}T23:59:59`).toISOString() : null
    await save({ inzendingen_deadline: iso })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pre-pool</p>
      <div className="space-y-3">
        <Toggle
          checked={inzendingenOpen}
          onChange={(val) => { setInzendingenOpen(val); save({ inzendingen_open: val }, () => setInzendingenOpen(!val)) }}
          label="Inzendingen open"
          description="Handmatige override. Deadline hieronder heeft voorrang als die verstreken is."
          disabled={saving}
        />

        {/* Deadline picker */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="font-semibold text-gray-800 mb-1">Deadline pre-pool inzendingen</div>
          <div className="text-sm text-gray-500 mb-3">
            Na dit tijdstip zijn inzendingen automatisch gesloten, ook als de toggle op &apos;open&apos; staat.
            Leeg = geen automatische deadline.
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={deadline}
              onChange={(e) => saveDeadline(e.target.value)}
              disabled={saving}
              className="input-field text-sm"
            />
            {deadline && (
              <button
                onClick={() => saveDeadline('')}
                disabled={saving}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Wissen
              </button>
            )}
          </div>
          {deadline && (
            <p className="text-xs text-gray-400 mt-2">
              Sluit: {new Date(`${deadline}T23:59:59`).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        <Toggle
          checked={scoresZichtbaar}
          onChange={(val) => { setScoresZichtbaar(val); save({ scores_zichtbaar: val }, () => setScoresZichtbaar(!val)) }}
          label="Scores zichtbaar"
          description="Iedereen ziet pre-pool scores en ranglijst."
          disabled={saving}
        />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-2">WK Poule</p>
      <div className="space-y-3">
        <Toggle
          checked={wkPouleOpen}
          onChange={(val) => { setWkPouleOpen(val); save({ wk_poule_open: val }, () => setWkPouleOpen(!val)) }}
          label="WK Poule open (incidenten &amp; topscorer)"
          description="Wedstrijden sluiten automatisch 5 minuten voor aftrap. Incidenten/topscorer via deze toggle."
          disabled={saving}
        />
        <Toggle
          checked={wkScoresZichtbaar}
          onChange={(val) => { setWkScoresZichtbaar(val); save({ wk_scores_zichtbaar: val }, () => setWkScoresZichtbaar(!val)) }}
          label="WK Scores zichtbaar"
          description="Iedereen ziet WK poule scores."
          disabled={saving}
        />
      </div>
      {status === 'success' && <p className="text-sm text-green-600 font-medium">✅ Instelling opgeslagen.</p>}
      {status === 'error' && <p className="text-sm text-red-600">❌ Opslaan mislukt. Probeer opnieuw.</p>}
    </div>
  )
}
