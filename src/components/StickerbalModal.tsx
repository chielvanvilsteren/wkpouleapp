'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function getSessionId() {
  let id = localStorage.getItem('spel_session_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    localStorage.setItem('spel_session_id', id)
  }
  return id
}

interface Props {
  defaultName?: string
  onClose: () => void
}

export default function StickerbalModal({ defaultName = '', onClose }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'pick' | 'create' | 'join'>('pick')
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [teamSize, setTeamSize] = useState<1 | 2 | 3>(1)
  const [maxGoals, setMaxGoals] = useState(5)
  const [maxMinutes, setMaxMinutes] = useState(3)
  const [dribblingEnabled, setDribblingEnabled] = useState(true)
  const [powerupsEnabled, setPowerupsEnabled] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('spel_display_name')
    setName(saved || defaultName)
  }, [defaultName])

  async function handleCreate() {
    if (!name.trim()) { setError('Vul een naam in.'); return }
    setLoading(true); setError('')
    localStorage.setItem('spel_display_name', name.trim())
    const res = await fetch('/api/spel/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name.trim(), teamSize, maxGoals, maxMinutes, dribblingEnabled, powerupsEnabled, testMode, sessionId: getSessionId() }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    router.push(`/spel/${data.code}`)
  }

  async function handleJoin() {
    if (!name.trim()) { setError('Vul een naam in.'); return }
    if (!joinCode.trim()) { setError('Vul een spelcode in.'); return }
    setLoading(true); setError('')
    localStorage.setItem('spel_display_name', name.trim())
    const res = await fetch('/api/spel/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: joinCode.trim(), displayName: name.trim(), sessionId: getSessionId() }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    router.push(`/spel/${data.code}`)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative" style={{ padding: '28px 28px 24px' }}>
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-1">⚽</div>
          <h2 className="text-xl font-black text-gray-900">Stickerbal</h2>
          <p className="text-xs text-gray-400 mt-0.5">Multiplayer · 1v1 · 2v2 · 3v3</p>
        </div>

        {mode === 'pick' && (
          <div className="space-y-2">
            <button onClick={() => setMode('create')}
              className="w-full py-3 rounded-xl bg-oranje-500 hover:bg-oranje-600 text-white font-bold text-sm transition-colors">
              Nieuw spel aanmaken
            </button>
            <button onClick={() => setMode('join')}
              className="w-full py-3 rounded-xl bg-knvb-500 hover:bg-knvb-600 text-white font-bold text-sm transition-colors">
              Meedoen met spelcode
            </button>
          </div>
        )}

        {mode !== 'pick' && (
          <div className="space-y-3">
            <button onClick={() => { setMode('pick'); setError('') }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Terug
            </button>

            {/* Naam tonen als bekend, anders invoerveld */}
            {name && defaultName ? (
              <p className="text-sm text-gray-600">
                Spelen als <span className="font-bold text-knvb-600">{name}</span>
              </p>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Jouw naam</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-knvb-400"
                  maxLength={16}
                  autoFocus
                />
              </div>
            )}

            {mode === 'create' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Teams</label>
                  <div className="flex gap-1.5">
                    {([1, 2, 3] as const).map(n => (
                      <button key={n} onClick={() => setTeamSize(n)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${teamSize === n ? 'bg-knvb-500 text-white border-knvb-500' : 'border-gray-200 text-gray-500 hover:border-knvb-300'}`}>
                        {n}v{n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Max doelpunten</label>
                    <input type="number" min={1} max={20} value={maxGoals}
                      onChange={e => setMaxGoals(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-knvb-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Max minuten</label>
                    <input type="number" min={1} max={10} value={maxMinutes}
                      onChange={e => setMaxMinutes(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-knvb-400" />
                  </div>
                </div>
                <label className="flex items-center justify-between py-1">
                  <span className="text-xs font-semibold text-gray-600">🔧 Testmodus (geen scores)</span>
                  <button type="button" onClick={() => setTestMode(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${testMode ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${testMode ? 'translate-x-5' : ''}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between py-1">
                  <span className="text-xs font-semibold text-gray-600">Power-ups ⚡❄️💥</span>
                  <button type="button" onClick={() => setPowerupsEnabled(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${powerupsEnabled ? 'bg-knvb-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${powerupsEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between py-1">
                  <span className="text-xs font-semibold text-gray-600">Dribbelen</span>
                  <button
                    type="button"
                    onClick={() => setDribblingEnabled(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${dribblingEnabled ? 'bg-knvb-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dribblingEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </label>
                <button onClick={handleCreate} disabled={loading}
                  className="w-full py-3 rounded-xl bg-oranje-500 hover:bg-oranje-600 text-white font-bold text-sm disabled:opacity-40 transition-colors">
                  {loading ? 'Aanmaken…' : 'Spel aanmaken →'}
                </button>
              </>
            )}

            {mode === 'join' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Spelcode</label>
                  <input
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    placeholder="BIJV. AB3X7"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-knvb-400"
                    maxLength={5}
                  />
                </div>
                <button onClick={handleJoin} disabled={loading}
                  className="w-full py-3 rounded-xl bg-knvb-500 hover:bg-knvb-600 text-white font-bold text-sm disabled:opacity-40 transition-colors">
                  {loading ? 'Meedoen…' : 'Meedoen →'}
                </button>
              </>
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
