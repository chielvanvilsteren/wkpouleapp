'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match, MatchPrediction, WkIncidentsPrediction } from '@/types'

type Props = {
  matches: Match[]
  initialPredictions: MatchPrediction[]
  initialIncidents: WkIncidentsPrediction | null
  isOpen: boolean
  now: string  // ISO from server — avoids client clock drift
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Groepsfase',
  r32: 'Ronde van 32',
  r16: 'Ronde van 16',
  qf: 'Kwartfinales',
  sf: 'Halve finales',
  '3rd': '3e plaatswedstrijd',
  final: 'Finale',
}

function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      value={value}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
      disabled={disabled}
      className="w-14 text-center input-field text-lg font-bold px-1 py-1"
    />
  )
}

export default function WkPouleForm({ matches, initialPredictions, initialIncidents, isOpen, now }: Props) {
  // Build prediction map: match_id → {home, away}
  const initMap = new Map(initialPredictions.map((p) => [p.match_id, { home: p.home_score, away: p.away_score }]))
  const [scores, setScores] = useState<Map<number, { home: number; away: number }>>(
    new Map(matches.map((m) => [m.id, initMap.get(m.id) ?? { home: 0, away: 0 }]))
  )

  const [rodeKaart, setRodeKaart] = useState(initialIncidents?.rode_kaart ?? '')
  const [geleKaart, setGeleKaart] = useState(initialIncidents?.gele_kaart ?? '')
  const [geblesseerde, setGeblesseerde] = useState(initialIncidents?.geblesseerde ?? '')
  const [eersteGoalNl, setEersteGoalNl] = useState(initialIncidents?.eerste_goal_nl ?? '')
  const [topscorerWk, setTopscorerWk] = useState(initialIncidents?.topscorer_wk ?? '')
  const [incidentsDefinitief, setIncidentsDefinitief] = useState(initialIncidents?.is_definitief ?? false)
  const [confirmDefinitief, setConfirmDefinitief] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'draft' | 'definitief' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['group-F', 'group-A']))

  const setScore = (matchId: number, side: 'home' | 'away', val: number) => {
    setScores((prev) => {
      const next = new Map(prev)
      const cur = next.get(matchId)!
      next.set(matchId, { ...cur, [side]: val })
      return next
    })
  }

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleSave = async (definitief: boolean) => {
    setSaving(true)
    setSaveStatus('idle')
    setErrorMsg('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErrorMsg('Niet ingelogd.'); setSaving(false); return }

    // Save all match predictions
    const matchPayloads = matches.map((m) => ({
      user_id: user.id,
      match_id: m.id,
      home_score: scores.get(m.id)!.home,
      away_score: scores.get(m.id)!.away,
    }))

    const { error: matchError } = await supabase
      .from('match_predictions')
      .upsert(matchPayloads, { onConflict: 'user_id,match_id' })

    if (matchError) { setErrorMsg(matchError.message); setSaveStatus('error'); setSaving(false); return }

    // Save incidents
    const incidentsPayload = {
      user_id: user.id,
      rode_kaart: rodeKaart.trim(),
      gele_kaart: geleKaart.trim(),
      geblesseerde: geblesseerde.trim(),
      eerste_goal_nl: eersteGoalNl.trim(),
      topscorer_wk: topscorerWk.trim(),
      is_definitief: definitief,
      updated_at: new Date().toISOString(),
    }

    const { error: incidentsError } = await supabase
      .from('wk_incidents_predictions')
      .upsert(incidentsPayload, { onConflict: 'user_id' })

    if (incidentsError) { setErrorMsg(incidentsError.message); setSaveStatus('error'); setSaving(false); return }

    if (definitief) {
      setIncidentsDefinitief(true)
      setSaveStatus('definitief')
    } else {
      setSaveStatus('draft')
      setTimeout(() => setSaveStatus('idle'), 4000)
    }

    setSaving(false)
    setConfirmDefinitief(false)
  }

  // Group matches by stage + group
  const grouped: { key: string; label: string; matches: Match[] }[] = []
  const stageOrder = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']

  for (const stage of stageOrder) {
    const stageMatches = matches.filter((m) => m.stage === stage)
    if (stageMatches.length === 0) continue

    if (stage === 'group') {
      const groups = Array.from(new Set(stageMatches.map((m) => m.group_name).filter(Boolean))).sort() as string[]
      for (const g of groups) {
        grouped.push({
          key: `group-${g}`,
          label: `Groep ${g}`,
          matches: stageMatches.filter((m) => m.group_name === g),
        })
      }
    } else {
      grouped.push({ key: stage, label: STAGE_LABELS[stage], matches: stageMatches })
    }
  }

  const canEdit = isOpen && !incidentsDefinitief
  // A match locks 5 minutes before kick-off
  const nowMs = new Date(now).getTime()
  const matchIsOpen = (match: Match) => isOpen && (new Date(match.match_date).getTime() - 5 * 60 * 1000) > nowMs
  const filledMatches = Array.from(scores.values()).filter((s) => s.home !== 0 || s.away !== 0).length

  return (
    <div className="space-y-6">
      {incidentsDefinitief && (
        <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm font-medium">
          ✅ Voorspelling definitief ingezonden. Wedstrijdscores en incidenten zijn vergrendeld.
        </div>
      )}
      {!isOpen && !incidentsDefinitief && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg text-sm font-medium">
          ⚠️ WK Poule is gesloten. Voorspellingen kunnen niet meer aangepast worden.
        </div>
      )}

      {/* Progress */}
      <div className="card py-3 px-5 flex items-center gap-4">
        <div className="flex-1 bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-oranje-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${Math.round((filledMatches / matches.length) * 100)}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {filledMatches} / {matches.length} wedstrijden ingevuld
        </span>
      </div>

      {/* Match sections */}
      {grouped.map(({ key, label, matches: groupMatches }) => (
        <div key={key} className="card p-0 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 bg-knvb-500 text-white font-semibold hover:bg-knvb-600 transition-colors"
            onClick={() => toggleGroup(key)}
          >
            <span>{label}</span>
            <span className="text-white/70 text-sm">
              {openGroups.has(key) ? '▲' : '▼'}
            </span>
          </button>

          {openGroups.has(key) && (
            <div className="divide-y divide-gray-100">
              {groupMatches.map((match) => {
                const s = scores.get(match.id)!
                return (
                  <div key={match.id} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50">
                    <span className="text-xs text-gray-400 w-16 shrink-0">
                      {new Date(match.match_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="flex-1 text-sm font-medium text-right text-gray-800 truncate">{match.home_team}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <ScoreInput value={s.home} onChange={(v) => setScore(match.id, 'home', v)} disabled={!matchIsOpen(match)} />
                      <span className="text-gray-400 font-bold">—</span>
                      <ScoreInput value={s.away} onChange={(v) => setScore(match.id, 'away', v)} disabled={!matchIsOpen(match)} />
                    </div>
                    <span className="flex-1 text-sm font-medium text-left text-gray-800 truncate">{match.away_team}</span>
                    {!matchIsOpen(match) && isOpen && (
                      <span className="text-xs text-gray-400 shrink-0">🔒</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {/* NL Incidents */}
      <div className="card">
        <h2 className="section-title">NL Incidenten & Topscorer</h2>
        <p className="text-sm text-gray-500 mb-4">
          Incidenten: 10 punten per correct antwoord. Topscorer WK: 20 punten.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🟥 Eerste Rode Kaart NL <span className="text-gray-400 font-normal">(optioneel)</span></label>
            <input type="text" value={rodeKaart} onChange={(e) => setRodeKaart(e.target.value)} disabled={!canEdit} className="input-field" placeholder="Spelernaam" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🟨 Eerste Gele Kaart NL <span className="text-gray-400 font-normal">(optioneel)</span></label>
            <input type="text" value={geleKaart} onChange={(e) => setGeleKaart(e.target.value)} disabled={!canEdit} className="input-field" placeholder="Spelernaam" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🩹 Eerste Geblesseerde NL</label>
            <input type="text" value={geblesseerde} onChange={(e) => setGeblesseerde(e.target.value)} disabled={!canEdit} className="input-field" placeholder="Spelernaam" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">⚽ Eerste Doelpunt NL</label>
            <input type="text" value={eersteGoalNl} onChange={(e) => setEersteGoalNl(e.target.value)} disabled={!canEdit} className="input-field" placeholder="Spelernaam" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">🏆 Topscorer WK <span className="text-gray-400 font-normal">(alle landen)</span></label>
            <input type="text" value={topscorerWk} onChange={(e) => setTopscorerWk(e.target.value)} disabled={!canEdit} className="input-field" placeholder="Spelersnaam + land" />
          </div>
        </div>
      </div>

      {/* Save buttons */}
      {canEdit && (
        <div className="flex flex-col items-center gap-3">
          {!confirmDefinitief ? (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button onClick={() => handleSave(false)} disabled={saving} className="btn-secondary text-base px-8 py-3 w-full sm:w-auto">
                {saving ? 'Opslaan...' : '💾 Concept opslaan'}
              </button>
              <button onClick={() => setConfirmDefinitief(true)} disabled={saving} className="btn-primary text-base px-8 py-3 w-full sm:w-auto">
                📨 Definitief inzenden
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 w-full max-w-md text-center">
              <p className="font-semibold text-amber-900 mb-1">Weet je het zeker?</p>
              <p className="text-sm text-amber-700 mb-4">Na definitief inzenden kun je de <strong>incidenten en topscorer niet meer aanpassen</strong>. Wedstrijdscores ook niet.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setConfirmDefinitief(false)} className="btn-secondary px-6 py-2">Annuleren</button>
                <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary px-6 py-2">
                  {saving ? 'Inzenden...' : 'Ja, inzenden'}
                </button>
              </div>
            </div>
          )}
          {saveStatus === 'draft' && (
            <div className="bg-blue-50 border border-blue-300 text-blue-700 px-6 py-3 rounded-lg font-medium">Concept opgeslagen ✅</div>
          )}
          {saveStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-lg text-sm">Fout bij opslaan: {errorMsg}</div>
          )}
        </div>
      )}
    </div>
  )
}
