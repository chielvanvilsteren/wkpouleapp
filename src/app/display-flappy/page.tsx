"use client"

import { useEffect, useRef, useState } from "react";

const MEDALS = ["🥇", "🥈", "🥉"];
type Entry = { user_id: string; display_name: string; best_score: number };

interface Ball {
  x: number; y: number; vx: number; vy: number;
  r: number; size: number; rot: number; rotV: number;
  el: HTMLDivElement;
}

function rnd(lo: number, hi: number) { return lo + Math.random() * (hi - lo); }

function makeBalls(container: HTMLDivElement): Ball[] {
  const sizes = [72, 96, 80, 64, 88, 68, 104, 76, 60, 84];
  return sizes.map((size) => {
    const el = document.createElement("div");
    el.textContent = "⚽";
    el.style.cssText = `position:fixed;font-size:${size}px;opacity:0.28;pointer-events:none;user-select:none;line-height:1;transform-origin:center;will-change:transform,left,top;`;
    container.appendChild(el);
    const r = size * 0.48;
    const x = rnd(r, window.innerWidth  - r);
    const y = rnd(r, window.innerHeight - r);
    const speed = rnd(1.2, 2.2);
    const angle = Math.random() * Math.PI * 2;
    const rotV  = rnd(1.0, 2.5) * (Math.random() < 0.5 ? 1 : -1);
    return { x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, r, size, rot: 0, rotV, el };
  });
}

function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }

function resolveRect(b: Ball, rect: DOMRect) {
  const cx = clamp(b.x, rect.left, rect.right);
  const cy = clamp(b.y, rect.top,  rect.bottom);
  const dx = b.x - cx, dy = b.y - cy;
  const d  = Math.sqrt(dx*dx + dy*dy);
  if (d === 0 || d >= b.r) return;
  const nx = dx/d, ny = dy/d;
  b.x += nx * (b.r - d); b.y += ny * (b.r - d);
  const dvn = b.vx*nx + b.vy*ny;
  if (dvn < 0) { b.vx -= 2*dvn*nx; b.vy -= 2*dvn*ny; b.rotV = -b.rotV; }
}

export default function DisplayFlappyPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const bgRef    = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/display-flappy");
      if (res.ok) setEntries(await res.json());
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const container = bgRef.current;
    if (!container) return;
    const balls = makeBalls(container);
    let boardRect: DOMRect | null = null;
    let frame = 0;
    let rafId: number;

    function loop() {
      const w = window.innerWidth, h = window.innerHeight;
      frame++;
      if (frame % 60 === 1) boardRect = boardRef.current?.getBoundingClientRect() ?? null;

      // Move + wall bounce
      for (const b of balls) {
        b.x += b.vx; b.y += b.vy; b.rot += b.rotV;
        if (b.x - b.r < 0)  { b.x = b.r;      b.vx =  Math.abs(b.vx); b.rotV = -b.rotV; }
        if (b.x + b.r > w)  { b.x = w - b.r;  b.vx = -Math.abs(b.vx); b.rotV = -b.rotV; }
        if (b.y - b.r < 0)  { b.y = b.r;      b.vy =  Math.abs(b.vy); }
        if (b.y + b.r > h)  { b.y = h - b.r;  b.vy = -Math.abs(b.vy); }
        if (boardRect) resolveRect(b, boardRect);
      }

      // Ball–ball elastic collision
      for (let i = 0; i < balls.length; i++) {
        for (let j = i+1; j < balls.length; j++) {
          const a = balls[i], b = balls[j];
          const dx = b.x-a.x, dy = b.y-a.y;
          const d = Math.sqrt(dx*dx+dy*dy);
          const min = a.r+b.r;
          if (d < min && d > 0) {
            const nx = dx/d, ny = dy/d;
            const ov = (min-d)/2;
            a.x -= nx*ov; a.y -= ny*ov;
            b.x += nx*ov; b.y += ny*ov;
            const dvn = (a.vx-b.vx)*nx + (a.vy-b.vy)*ny;
            if (dvn > 0) {
              a.vx -= dvn*nx; a.vy -= dvn*ny;
              b.vx += dvn*nx; b.vy += dvn*ny;
              a.rotV = -a.rotV; b.rotV = -b.rotV;
            }
          }
        }
      }

      for (const b of balls) {
        b.el.style.left      = (b.x - b.r) + "px";
        b.el.style.top       = (b.y - b.r) + "px";
        b.el.style.transform = `rotate(${b.rot}deg)`;
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); for (const b of balls) b.el.remove(); };
  }, []);

  return (
    <div className="relative min-h-screen bg-knvb-500 flex flex-col">
      <div ref={bgRef} style={{ zIndex: 0 }} />

      <div className="relative flex flex-col flex-1" style={{ zIndex: 1 }}>
        <div className="text-center py-8 px-4">
          <div className="text-5xl mb-2">⚽</div>
          <h1 className="text-4xl font-bold text-white tracking-wide">Flappy Bal</h1>
          <p className="text-white/50 text-sm mt-1">Beste score per speler</p>
        </div>

        <div className="flex-1 px-4 pb-8 max-w-xl mx-auto w-full">
          <div ref={boardRef} className="bg-white rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full">
              <thead>
                <tr className="bg-oranje-500 text-white">
                  <th className="px-6 py-4 text-left w-16 text-lg">#</th>
                  <th className="px-6 py-4 text-left text-lg">Naam</th>
                  <th className="px-6 py-4 text-right text-lg font-bold">Score</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400 animate-pulse">Laden…</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400">Nog geen scores</td></tr>
                ) : entries.map((entry, idx) => (
                  <tr key={entry.user_id} className={`border-b border-gray-100 ${idx%2===0?"bg-white":"bg-gray-50"} ${idx<3?"bg-oranje-50":""}`}>
                    <td className="px-6 py-4 text-center font-bold text-gray-400 text-xl">
                      {idx < 3 ? <span className="text-2xl">{MEDALS[idx]}</span> : idx+1}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 text-xl">{entry.display_name}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-oranje-600 text-3xl">{entry.best_score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center pb-4 text-white/40 text-sm">
          Vernieuwt automatisch elke 30 seconden
        </div>
      </div>
    </div>
  );
}
