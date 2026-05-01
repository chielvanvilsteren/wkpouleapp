'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WkIncidentsUitslag } from '@/types'

type Props = { uitslag: WkIncidentsUitslag }

export default function AdminWkIncidentsForm({ uitslag }: Props) {
  const [rodeKaart, setRodeKaart] = useState(uitslag.rode_kaart ?? '')
  const [geleKaart, setGeleKaart] = useState(uitslag.gele_kaart ?? '')
  const [geblesseerde, setGeblesseerde] = useState(uitslag.geblesseerde ?? '')
  const [eersteGoalNl, setEersteGoalNl] = useState(uitslag.eerste_goal_nl ?? '')
  const [topscorerWk, setTopscorerWk] = useState(uitslag.topscorer_wk ?? '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'recalculating' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setStatus('saving')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase
      .from('wk_incidents_uitslag')
      .upsert({
        id: 1,
        rode_kaart: rodeKaart.trim(),
        gele_kaart: geleKaart.trim(),
        geblesseerde: geblesseerde.trim(),
        eerste_goal_nl: eersteGoalNl.trim(),
        topscorer_wk: topscorerWk.trim(),
        updated_at: new Date().toISOString(),
      })

    if (error) { setErrorMsg(error.message); setStatus('error'); setSaving(false); return }

    setStatus('recalculating')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/wk-scores/recalculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">🟥 Eerste Rode Kaart NL</label>
          <input type="text" value={rodeKaart} onChange={(e) => setRodeKaart(e.target.value)} className="input-field" placeholder="Spelernaam" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">🟨 Eerste Gele Kaart NL</label>
          <input type="text" value={geleKaart} onChange={(e) => setGeleKaart(e.target.value)} className="input-field" placeholder="Spelernaam" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">🩹 Eerste Geblesseerde NL</label>
          <input type="text" value={geblesseerde} onChange={(e) => setGeblesseerde(e.target.value)} className="input-field" placeholder="Spelernaam" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">⚽ Eerste Doelpunt NL</label>
          <input type="text" value={eersteGoalNl} onChange={(e) => setEersteGoalNl(e.target.value)} className="input-field" placeholder="Spelernaam" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">🏆 Topscorer WK (alle landen)</label>
          <input type="text" value={topscorerWk} onChange={(e) => setTopscorerWk(e.target.value)} className="input-field" placeholder="Spelersnaam + land" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {status === 'saving' && 'Opslaan...'}
          {status === 'recalculating' && 'WK Scores berekenen...'}
          {(status === 'idle' || status === 'success' || status === 'error') && 'Opslaan & WK Scores Herberekenen'}
        </button>
        {status === 'success' && <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">✅ Opgeslagen en scores herberekend!</div>}
        {status === 'error' && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">❌ Fout: {errorMsg}</div>}
      </div>
    </div>
  )
}
