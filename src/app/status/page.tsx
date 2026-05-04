import RotatingFlag from '@/components/RotatingFlag'

export const dynamic = 'force-dynamic'

export default function StatusPage() {
  const now = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  return (
    <div className="min-h-screen bg-knvb-500 flex flex-col items-center justify-center px-4 gap-6">
      {/* Waving flag */}
      <RotatingFlag className="w-48 md:w-64" />

      {/* Title */}
      <div className="text-center">
        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none text-white">
          WK <span className="neon-pixel">Pool</span>
        </h1>
        <p className="text-white/50 text-sm uppercase tracking-widest mt-2 font-semibold">
          Oranje WK 2026
        </p>
      </div>

      {/* Status card */}
      <div className="bg-white/10 border border-white/15 rounded-2xl px-8 py-6 text-center backdrop-blur-sm max-w-sm w-full">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500" />
          </span>
          <span className="text-green-400 font-bold text-lg">Alles operationeel</span>
        </div>
        <hr className="border-white/10 mb-4" />
        <p className="text-white/40 text-xs">Gecontroleerd op</p>
        <p className="text-white/75 font-semibold text-sm mt-0.5">{now}</p>
      </div>
    </div>
  )
}
