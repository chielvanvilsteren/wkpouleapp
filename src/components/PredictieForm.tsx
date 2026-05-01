'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Prediction, Score } from '@/types'

type Props = {
  initialPrediction: Prediction | null
  isOpen: boolean
  score: Score | null
}

function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-oranje-500 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
        {filled} / {total}
      </span>
    </div>
  )
}

function PlayerGrid({
  values,
  onChange,
  prefix,
  disabled,
}: {
  values: string[]
  onChange: (idx: number, val: string) => void
  prefix: string
  disabled: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {values.map((val, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-6 text-right shrink-0">{idx + 1}.</span>
          <input
            type="text"
            value={val}
            onChange={(e) => onChange(idx, e.target.value)}
            disabled={disabled}
            className="input-field text-sm"
            placeholder={`${prefix} ${idx + 1}`}
          />
        </div>
      ))}
    </div>
  )
}

function toArray(arr: string[] | undefined | null, len: number): string[] {
  if (!arr || arr.length === 0) return Array(len).fill('')
  const result = [...arr]
  while (result.length < len) result.push('')
  return result.slice(0, len)
}

export default function PredictieForm({ initialPrediction, isOpen, score }: Props) {
  const [selectie, setSelectie] = useState<string[]>(
    toArray(initialPrediction?.selectie, 26)
  )
  const [basisXi, setBasisXi] = useState<string[]>(
    toArray(initialPrediction?.basis_xi, 11)
  )
  const [rodeKaart, setRodeKaart] = useState(initialPrediction?.rode_kaart ?? '')
  const [geleKaart, setGeleKaart] = useState(initialPrediction?.gele_kaart ?? '')
  const [geblesseerde, setGeblesseerde] = useState(initialPrediction?.geblesseerde ?? '')
  const [eersteGoal, setEersteGoal] = useState(initialPrediction?.eerste_goal ?? '')

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const filledSelectie = selectie.filter((s) => s.trim() !== '').length
  const filledBasisXi = basisXi.filter((s) => s.trim() !== '').length
  const filledIncidenten = [rodeKaart, geleKaart, geblesseerde, eersteGoal].filter((s) => s.trim() !== '').length

  const updateSelectie = useCallback((idx: number, val: string) => {
    setSelectie((prev) => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }, [])

  const updateBasisXi = useCallback((idx: number, val: string) => {
    setBasisXi((prev) => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('idle')
    setErrorMsg('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErrorMsg('Niet ingelogd.')
      setSaving(false)
      return
    }

    const payload = {
      user_id: user.id,
      selectie: selectie.map((s) => s.trim()),
      basis_xi: basisXi.map((s) => s.trim()),
      rode_kaart: rodeKaart.trim(),
      gele_kaart: geleKaart.trim(),
      geblesseerde: geblesseerde.trim(),
      eerste_goal: eersteGoal.trim(),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('predictions')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      setErrorMsg(error.message)
      setSaveStatus('error')
    } else {
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 4000)
    }

    setSaving(false)
  }

  return (
    <div className="space-y-8">
      {/* Score banner */}
      {score && (
        <div className="bg-gradient-to-r from-knvb-500 to-knvb-600 text-white rounded-xl p-5">
          <div className="text-sm text-white/70 mb-1">Huidige totaalscore</div>
          <div className="flex items-end gap-6">
            <div>
              <span className="text-4xl font-bold">{score.totaal}</span>
              <span className="text-white/70 ml-1">/ 77</span>
            </div>
            <div className="text-sm text-white/80 space-y-0.5">
              <div>Selectie: <strong>{score.selectie_punten}</strong> / 26</div>
              <div>Basis XI: <strong>{score.basis_xi_punten}</strong> / 11</div>
              <div>Incidenten: <strong>{score.incidenten_punten}</strong> / 40</div>
            </div>
          </div>
        </div>
      )}

      {!isOpen && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg text-sm font-medium">
          ⚠️ Inzendingen zijn gesloten. Je kunt je voorspelling niet meer aanpassen.
        </div>
      )}

      {/* Sectie A: Selectie */}
      <div className="card">
        <h2 className="section-title">Sectie A — Officiële Selectie (26 spelers)</h2>
        <ProgressBar filled={filledSelectie} total={26} />
        <PlayerGrid
          values={selectie}
          onChange={updateSelectie}
          prefix="Speler"
          disabled={!isOpen}
        />
      </div>

      {/* Sectie B: Basis XI */}
      <div className="card">
        <h2 className="section-title">Sectie B — Basis XI vs. Japan (11 spelers)</h2>
        <p className="text-sm text-gray-500 mb-4">Volgorde maakt niet uit — welke 11 spelers staan er in de basis?</p>
        <ProgressBar filled={filledBasisXi} total={11} />
        <PlayerGrid
          values={basisXi}
          onChange={updateBasisXi}
          prefix="Speler"
          disabled={!isOpen}
        />
      </div>

      {/* Sectie C: Incidenten */}
      <div className="card">
        <h2 className="section-title">Sectie C — Incidenten (10 punten elk)</h2>
        <p className="text-sm text-gray-500 mb-4">Rode en gele kaart mogen leeg gelaten worden.</p>
        <ProgressBar filled={filledIncidenten} total={4} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🟥 Eerste Rode Kaart <span className="text-gray-400 font-normal">(optioneel)</span>
            </label>
            <input
              type="text"
              value={rodeKaart}
              onChange={(e) => setRodeKaart(e.target.value)}
              disabled={!isOpen}
              className="input-field"
              placeholder="Spelernaam"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🟨 Eerste Gele Kaart <span className="text-gray-400 font-normal">(optioneel)</span>
            </label>
            <input
              type="text"
              value={geleKaart}
              onChange={(e) => setGeleKaart(e.target.value)}
              disabled={!isOpen}
              className="input-field"
              placeholder="Spelernaam"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🩹 Eerste Geblesseerde
            </label>
            <input
              type="text"
              value={geblesseerde}
              onChange={(e) => setGeblesseerde(e.target.value)}
              disabled={!isOpen}
              className="input-field"
              placeholder="Spelernaam"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ⚽ Eerste Goal
            </label>
            <input
              type="text"
              value={eersteGoal}
              onChange={(e) => setEersteGoal(e.target.value)}
              disabled={!isOpen}
              className="input-field"
              placeholder="Spelernaam"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      {isOpen && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-lg px-12 py-4 w-full sm:w-auto"
          >
            {saving ? 'Opslaan...' : 'Voorspelling Opslaan'}
          </button>

          {saveStatus === 'success' && (
            <div className="bg-green-50 border border-green-300 text-green-700 px-6 py-3 rounded-lg font-medium">
              Voorspelling opgeslagen! ✅
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-lg text-sm">
              Fout bij opslaan: {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
