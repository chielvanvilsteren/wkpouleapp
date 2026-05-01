import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🇳🇱⚽🏆</div>
        <h1 className="text-4xl md:text-5xl font-bold text-knvb-500 mb-4">
          WK 2026 Oranje Pool
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Voorspel de officiële selectie, de basiself tegen Japan en de eerste incidenten.
          Wie heeft de meeste punten aan het einde?
        </p>

        {user ? (
          <Link href="/mijn-voorspelling" className="btn-primary text-lg px-8 py-4 inline-block">
            Mijn Voorspelling Invullen →
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 py-4">
              Aanmelden
            </Link>
            <Link href="/login" className="btn-outline text-lg px-8 py-4">
              Inloggen
            </Link>
          </div>
        )}
      </div>

      {/* Puntensysteem */}
      <div className="card mb-8">
        <h2 className="section-title">Puntensysteem</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-oranje-50 rounded-xl p-5 border border-oranje-200">
            <div className="text-3xl font-bold text-oranje-500 mb-1">1 pt</div>
            <div className="font-semibold text-gray-800 mb-1">Per speler in de selectie</div>
            <div className="text-sm text-gray-600">
              Raad alle 26 spelers van de officiële WK-selectie.
              Maximaal 26 punten.
            </div>
          </div>

          <div className="bg-oranje-50 rounded-xl p-5 border border-oranje-200">
            <div className="text-3xl font-bold text-oranje-500 mb-1">1 pt</div>
            <div className="font-semibold text-gray-800 mb-1">Per speler in de Basis XI</div>
            <div className="text-sm text-gray-600">
              Raad de elf basisspelers van het eerste WK-duel van Oranje (vs. Japan).
              Maximaal 11 punten. Volgorde maakt niet uit.
            </div>
          </div>

          <div className="bg-oranje-50 rounded-xl p-5 border border-oranje-200">
            <div className="text-3xl font-bold text-oranje-500 mb-1">10 pt</div>
            <div className="font-semibold text-gray-800 mb-1">Per correct incident</div>
            <div className="text-sm text-gray-600">
              Raad wie de eerste rode kaart, eerste gele kaart, eerste geblesseerde en eerste doelpuntenmaker van het toernooi is.
              Maximaal 40 punten.
            </div>
          </div>
        </div>

        <div className="mt-6 bg-knvb-50 rounded-xl p-4 border border-knvb-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-knvb-700">Maximaal te behalen</span>
            <span className="text-2xl font-bold text-knvb-500">77 punten</span>
          </div>
          <div className="text-sm text-knvb-600 mt-1">26 (selectie) + 11 (basis XI) + 40 (incidenten)</div>
        </div>
      </div>

      {/* Spelregels */}
      <div className="card mb-8">
        <h2 className="section-title">Spelregels</h2>
        <ul className="space-y-3 text-gray-700">
          <li className="flex gap-3">
            <span className="text-oranje-500 font-bold mt-0.5">→</span>
            <span>Spelernamen worden <strong>hoofdletterongevoelig</strong> vergeleken — <em>Virgil van Dijk</em> en <em>virgil van dijk</em> tellen allebei.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-oranje-500 font-bold mt-0.5">→</span>
            <span>Je kunt je voorspelling aanpassen zolang de organisator de inzendingen niet heeft gesloten.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-oranje-500 font-bold mt-0.5">→</span>
            <span>Scores worden pas zichtbaar nadat de organisator de officiële uitslag heeft ingevuld.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-oranje-500 font-bold mt-0.5">→</span>
            <span>Bij gelijke score: alfabetisch op naam.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-oranje-500 font-bold mt-0.5">→</span>
            <span>Voor de Basis XI hoef je de volgorde niet te raden — alleen welke spelers.</span>
          </li>
        </ul>
      </div>

      {/* CTA */}
      {!user && (
        <div className="text-center bg-gradient-to-r from-knvb-500 to-knvb-600 text-white rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-2">Doe mee!</h3>
          <p className="text-white/80 mb-6">Maak een account aan en vul je voorspelling in.</p>
          <Link href="/register" className="bg-oranje-500 hover:bg-oranje-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors inline-block">
            Aanmelden →
          </Link>
        </div>
      )}
    </div>
  )
}
