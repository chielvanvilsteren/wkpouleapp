"use client";

import { useEffect, useState } from "react";

type SuspiciousAttempt = {
  id: string;
  display_name: string;
  submitted_score: number;
  server_elapsed_ms: number;
  minimum_ms: number;
  client_duration_ms: number | null;
  fps: number | null;
  created_at: string;
};

function fmt(ms: number) {
  return (ms / 1000).toFixed(1) + "s";
}

export default function AdminFlappySuspicious() {
  const [rows, setRows] = useState<SuspiciousAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/flappy-suspicious");
    if (res.ok) setRows(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const dismiss = async (id: string) => {
    await fetch("/api/admin/flappy-suspicious", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) return <p className="text-sm text-gray-500">Laden...</p>;
  if (rows.length === 0)
    return <p className="text-sm text-gray-500">Geen verdachte pogingen gevonden.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="pb-2 pr-4 font-medium">Speler</th>
            <th className="pb-2 pr-4 font-medium">Score</th>
            <th className="pb-2 pr-4 font-medium">Server tijd</th>
            <th className="pb-2 pr-4 font-medium">Minimum</th>
            <th className="pb-2 pr-4 font-medium">Client duur</th>
            <th className="pb-2 pr-4 font-medium">FPS</th>
            <th className="pb-2 pr-4 font-medium">Tijdstip</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const shortfall = r.minimum_ms - r.server_elapsed_ms;
            return (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium">{r.display_name}</td>
                <td className="py-2 pr-4">{r.submitted_score}</td>
                <td className="py-2 pr-4 text-red-600 font-mono">{fmt(r.server_elapsed_ms)}</td>
                <td className="py-2 pr-4 font-mono">{fmt(r.minimum_ms)}</td>
                <td className="py-2 pr-4 font-mono">
                  {r.client_duration_ms != null ? fmt(r.client_duration_ms) : "—"}
                </td>
                <td className="py-2 pr-4">{r.fps ?? "—"}</td>
                <td className="py-2 pr-4 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("nl-NL")}
                  {shortfall > 0 && (
                    <span className="ml-2 text-red-500">
                      ({fmt(shortfall)} tekort)
                    </span>
                  )}
                </td>
                <td className="py-2">
                  <button
                    onClick={() => dismiss(r.id)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                    title="Verwijder melding"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
