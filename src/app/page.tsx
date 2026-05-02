import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RotatingFlag from "@/components/RotatingFlag";
import CountdownTimer from "@/components/CountdownTimer";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      {/* Hero — full-width dark gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-knvb-700 via-knvb-600 to-knvb-500 text-white">
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-12">
            {/* Left: text + CTA */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium text-white/80 mb-6">
                <span className="w-2 h-2 bg-oranje-400 rounded-full animate-pulse" />
                WK 2026 · Canada / Mexico / VS
              </div>

              <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 leading-none">
                WK
                <br />
                <span className="neon-pixel">Pool</span>
                <span className="text-white"> 2026</span>
              </h1>

              <p className="text-white/70 text-lg mb-8 max-w-md">
                Voorspel de WK-selectie, de basis XI en elke wedstrijd. Wie wint
                de poule?
              </p>

              {user ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link
                    href="/mijn-voorspelling"
                    className="bg-oranje-500 hover:bg-oranje-600 text-white font-bold px-8 py-3.5 rounded-xl transition-colors inline-block text-center"
                  >
                    Mijn Voorspelling →
                  </Link>
                  <Link
                    href="/ranglijst"
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors inline-block text-center"
                  >
                    Ranglijst
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link
                    href="/register"
                    className="bg-oranje-500 hover:bg-oranje-600 text-white font-bold px-8 py-3.5 rounded-xl transition-colors inline-block text-center"
                  >
                    Aanmelden
                  </Link>
                  <Link
                    href="/login"
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors inline-block text-center"
                  >
                    Inloggen
                  </Link>
                </div>
              )}
            </div>

            {/* Right: rotating flags — fills container, max 560px on desktop */}
            <div className="w-full md:w-[560px] shrink-0">
              <RotatingFlag className="rounded-lg drop-shadow-2xl" />
            </div>
          </div>

          {/* Countdown */}
          <div className="mt-14 flex justify-center">
            <CountdownTimer />
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-black text-knvb-600">104</div>
              <div className="text-sm text-gray-500 mt-0.5">WK wedstrijden</div>
            </div>
            <div>
              <div className="text-3xl font-black text-oranje-500">2</div>
              <div className="text-sm text-gray-500 mt-0.5">Poules</div>
            </div>
            <div>
              <div className="text-3xl font-black text-knvb-600">37+</div>
              <div className="text-sm text-gray-500 mt-0.5">
                Max punten pre-poule
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Poule overview cards */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Twee poules, dubbel de spanning
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card border-l-4 border-l-oranje-500">
            <div className="text-2xl mb-2">📋</div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">Pre-Pool</h3>
            <p className="text-gray-600 text-sm mb-4">
              Voorspel de officiële 26-mans selectie en de basis XI tegen Japan
              — voor het WK begint.
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                ✓ 1 punt per correct selectiespeler{" "}
                <span className="text-gray-400">(max 26)</span>
              </li>
              <li>
                ✓ 1 punt per correcte basis XI-speler{" "}
                <span className="text-gray-400">(max 11)</span>
              </li>
            </ul>
          </div>

          <div className="card border-l-4 border-l-knvb-500">
            <div className="text-2xl mb-2">⚽</div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">WK Poule</h3>
            <p className="text-gray-600 text-sm mb-4">
              Voorspel alle 104 WK-wedstrijden, NL-incidenten en de
              WK-topscorer.
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ 3 punten exacte uitslag</li>
              <li>✓ 1 punt correct resultaat</li>
              <li>✓ 10 punten per NL-incident · 20 punten topscorer</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      {!user && (
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <div className="bg-gradient-to-r from-knvb-600 to-knvb-500 text-white rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">Doe mee!</h3>
            <p className="text-white/80 mb-6">
              Maak een account aan en vul je voorspelling in vóór het WK begint.
            </p>
            <Link
              href="/register"
              className="bg-oranje-500 hover:bg-oranje-600 text-white font-bold px-8 py-3 rounded-xl transition-colors inline-block"
            >
              Aanmelden →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
