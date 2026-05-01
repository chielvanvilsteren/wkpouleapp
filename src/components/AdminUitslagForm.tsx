'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MasterUitslag } from '@/types'

type Props = {
  uitslag: MasterUitslag
}

function toArray(arr: string[] | undefined | null, len: number): string[] {
  if (!arr || arr.length === 0) return Array(len).fill('')
  const result = [...arr]
  while (result.length < len) result.push('')
  return result.slice(0, len)
}

export default function AdminUitslagForm({ uitslag }: Props) {
  const [selectie, setSelectie] = useState<string[]>(toArray(uitslag.selectie, 26))
  const [basisXi, setBasisXi] = useState<string[]>(toArray(uitslag.basis_xi, 11))
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'recalculating' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const updateSelectie = (idx: number, val: string) => {
    setSelectie((prev) => { const next = [...prev]; next[idx] = val; return next })
  }
  const updateBasisXi = (idx: number, val: string) => {
    setBasisXi((prev) => { const next = [...prev]; next[idx] = val; return next })
  }

  const handleSave = async () => {
    setSaving(true)
    setStatus('saving')
    setErrorMsg('')

    const supabase = createClient()

    const { error: upsertError } = await supabase
      .from('master_uitslag')
      .upsert({
        id: 1,
        selectie: selectie.map((s) => s.trim()),
        basis_xi: basisXi.map((s) => s.trim()),
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      setErrorMsg(upsertError.message)
      setStatus('error')
      setSaving(false)
      return
    }

    setStatus('recalculating')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/scores/recalculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setErrorMsg(body.error ?? 'Score berekening mislukt.')
      setStatus('error')
    } else {
      setStatus('success')
      setTimeout(() => setStatus('idle'), 5000)
    }

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Selectie */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Officiële Selectie (26 spelers)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {selectie.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-6 text-right shrink-0">{idx + 1}.</span>
              <input
                type="text"
                value={val}
                onChange={(e) => updateSelectie(idx, e.target.value)}
                className="input-field text-sm"
                placeholder={`Speler ${idx + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Basis XI */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Werkelijke Basis XI vs. Japan (11 spelers)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {basisXi.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-6 text-right shrink-0">{idx + 1}.</span>
              <input
                type="text"
                value={val}
                onChange={(e) => updateBasisXi(idx, e.target.value)}
                className="input-field text-sm"
                placeholder={`Speler ${idx + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {status === 'saving' && 'Uitslag opslaan...'}
          {status === 'recalculating' && 'Scores berekenen...'}
          {(status === 'idle' || status === 'success' || status === 'error') && 'Uitslag Opslaan & Scores Herberekenen'}
        </button>

        {status === 'success' && (
          <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
            ✅ Uitslag opgeslagen en scores herberekend!
          </div>
        )}
        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            ❌ Fout: {errorMsg}
          </div>
        )}
      </div>
    </div>
  )
}
