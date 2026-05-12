'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/PageHeader'

function getSessionId() {
  let id = localStorage.getItem('spel_session_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    localStorage.setItem('spel_session_id', id)
  }
  return id
}

export default function SpelPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'pick' | 'create' | 'join'>('pick')
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [teamSize, setTeamSize] = useState<1 | 2 | 3>(1)
  const [maxGoals, setMaxGoals] = useState(5)
  const [maxMinutes, setMaxMinutes] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('spel_display_name')
    if (saved) setName(saved)
  }, [])

  async function handleCreate() {
    if (!name.trim()) { setError('Vul een naam in.'); return }
    setLoading(true); setError('')
    localStorage.setItem('spel_display_name', name.trim())
    const res = await fetch('/api/spel/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name.trim(), teamSize, maxGoals, maxMinutes, sessionId: getSessionId() }),
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
    <>
      <PageHeader title="Stickerbal" subtitle="Multiplayer voetbal · 1v1 · 2v2 · 3v3" />
      <div className="max-w-md mx-auto px-4 py-8">
        {mode === 'pick' && (
          <div className="space-y-3">
            <button onClick={() => setMode('create')}
              className="w-full py-4 rounded-xl bg-oranje-500 hover:bg-oranje-600 text-white font-bold text-lg transition-colors shadow-md">
              ⚽ Nieuw spel aanmaken
            </button>
            <button onClick={() => setMode('join')}
              className="w-full py-4 rounded-xl bg-knvb-500 hover:bg-knvb-600 text-white font-bold text-lg transition-colors shadow-md">
              🔑 Meedoen met spelcode
            </button>
            <p className="text-center text-xs text-gray-400 pt-2">
              Besturing: pijltjes bewegen · spatiebalk schiet
            </p>
          </div>
        )}

        {mode !== 'pick' && (
          <div className="card space-y-4">
            <button onClick={() => { setMode('pick'); setError('') }}
              className="text-sm text-gray-400 hover:text-gray-600">
              ← Terug
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jouw naam</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Bijv. Chiel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-knvb-400"
                maxLength={16}
                autoFocus
              />
            </div>

            {mode === 'create' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teams</label>
                  <div className="flex gap-2">
                    {([1, 2, 3] as const).map(n => (
                      <button key={n} onClick={() => setTeamSize(n)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                          teamSize === n ? 'bg-knvb-500 text-white border-knvb-500' : 'border-gray-200 text-gray-600 hover:border-knvb-300'
                        }`}>
                        {n}v{n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max doelpunten</label>
                    <input type="number" min={1} max={20} value={maxGoals}
                      onChange={e => setMaxGoals(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-knvb-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max minuten</label>
                    <input type="number" min={1} max={10} value={maxMinutes}
                      onChange={e => setMaxMinutes(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-knvb-400" />
                  </div>
                </div>
                <button onClick={handleCreate} disabled={loading}
                  className="w-full py-3 rounded-xl bg-oranje-500 hover:bg-oranje-600 text-white font-bold disabled:opacity-40 transition-colors">
                  {loading ? 'Aanmaken…' : 'Spel aanmaken →'}
                </button>
              </>
            )}

            {mode === 'join' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spelcode</label>
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
                  className="w-full py-3 rounded-xl bg-knvb-500 hover:bg-knvb-600 text-white font-bold disabled:opacity-40 transition-colors">
                  {loading ? 'Meedoen…' : 'Meedoen →'}
                </button>
              </>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        )}
      </div>
    </>
  )
}
