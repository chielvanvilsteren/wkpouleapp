"use client";

import { useEffect, useState } from "react";

type UserCredits = {
  id: string;
  display_name: string;
  preCredits: number;
  wkCredits: number;
  adminGrants: number;
  spent: number;
  available: number;
};

export default function AdminFlappyCredits() {
  const [users, setUsers] = useState<UserCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/flappy-credits");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grant = async (userId: string) => {
    const amount = amounts[userId] ?? 1;
    const note = notes[userId] ?? "";
    setGranting(userId);
    const res = await fetch("/api/admin/flappy-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount, note }),
    });
    if (res.ok) {
      setFeedback((prev) => ({ ...prev, [userId]: `+${amount} toegekend` }));
      setAmounts((prev) => ({ ...prev, [userId]: 1 }));
      setNotes((prev) => ({ ...prev, [userId]: "" }));
      await load();
      setTimeout(
        () => setFeedback((prev) => ({ ...prev, [userId]: "" })),
        3000
      );
    } else {
      const data = await res.json();
      setFeedback((prev) => ({
        ...prev,
        [userId]: data.error ?? "Fout",
      }));
    }
    setGranting(null);
  };

  if (loading) {
    return (
      <p className="text-gray-400 text-sm animate-pulse">Laden...</p>
    );
  }

  if (users.length === 0) {
    return <p className="text-gray-500 text-sm">Geen deelnemers gevonden.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-600 font-medium">
            <th className="text-left py-2 px-3">Naam</th>
            <th className="text-center py-2 px-3">Pre-pool</th>
            <th className="text-center py-2 px-3">WK-poule</th>
            <th className="text-center py-2 px-3">Admin</th>
            <th className="text-center py-2 px-3">Gespeeld</th>
            <th className="text-center py-2 px-3 font-semibold text-gray-800">
              ⚡ Beschikbaar
            </th>
            <th className="text-right py-2 px-3">Toekennen</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-2.5 px-3 font-medium text-gray-900">
                {u.display_name}
              </td>
              <td className="py-2.5 px-3 text-center text-gray-600">
                {u.preCredits}
              </td>
              <td className="py-2.5 px-3 text-center text-gray-600">
                {u.wkCredits}
              </td>
              <td className="py-2.5 px-3 text-center text-gray-600">
                {u.adminGrants > 0 ? (
                  <span className="text-knvb-600 font-medium">
                    +{u.adminGrants}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2.5 px-3 text-center text-gray-500">
                {u.spent > 0 ? `−${u.spent}` : "—"}
              </td>
              <td className="py-2.5 px-3 text-center">
                <span
                  className={`font-bold ${
                    u.available > 0 ? "text-oranje-500" : "text-gray-400"
                  }`}
                >
                  {u.available}
                </span>
              </td>
              <td className="py-2.5 px-3">
                <div className="flex items-center justify-end gap-2">
                  {feedback[u.id] ? (
                    <span className="text-xs text-green-600 font-medium min-w-[80px] text-right">
                      {feedback[u.id]}
                    </span>
                  ) : (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={amounts[u.id] ?? 1}
                        onChange={(e) =>
                          setAmounts((prev) => ({
                            ...prev,
                            [u.id]: Math.max(
                              1,
                              Math.min(100, parseInt(e.target.value) || 1)
                            ),
                          }))
                        }
                        className="w-14 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-knvb-400"
                      />
                      <input
                        type="text"
                        placeholder="Reden (opt.)"
                        value={notes[u.id] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [u.id]: e.target.value,
                          }))
                        }
                        className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-knvb-400"
                      />
                      <button
                        onClick={() => grant(u.id)}
                        disabled={granting === u.id}
                        className="px-3 py-1 rounded bg-knvb-500 hover:bg-knvb-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {granting === u.id ? "..." : "Ken toe"}
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-gray-400">
        Pre-pool = selectie + basis XI · WK-poule = wedstrijdresultaten ·
        Gespeeld = verbruikte credits
      </p>
    </div>
  );
}
