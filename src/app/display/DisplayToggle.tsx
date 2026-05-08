"use client"

import { useState, type ReactNode } from "react"

export default function DisplayToggle({
  pouleView,
  flappyView,
}: {
  pouleView: ReactNode
  flappyView: ReactNode
}) {
  const [mode, setMode] = useState<"poule" | "flappy">("poule")

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-center gap-2 pb-5 px-4">
        <button
          onClick={() => setMode("poule")}
          className={`px-7 py-2.5 rounded-full font-bold text-sm transition-all ${
            mode === "poule"
              ? "bg-white text-orange-600 shadow-lg scale-105"
              : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          🏆 Poule Scores
        </button>
        <button
          onClick={() => setMode("flappy")}
          className={`px-7 py-2.5 rounded-full font-bold text-sm transition-all ${
            mode === "flappy"
              ? "bg-white text-orange-600 shadow-lg scale-105"
              : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          ⚽ Flappy Bal
        </button>
      </div>

      {mode === "poule" ? pouleView : flappyView}
    </div>
  )
}
