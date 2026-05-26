"use client";

import { useState } from "react";

type PreDeelnemer = {
  id: string;
  display_name: string;
  heeftIngevuld: boolean;
  ingevuldOp: string | null;
};

type GroepDeelnemer = {
  id: string;
  display_name: string;
  heeftIngevuld: boolean;
};

type Props = {
  preDeelnemers: PreDeelnemer[];
  groepDeelnemers: GroepDeelnemer[];
};

export default function AdminDeelnemersToggle({ preDeelnemers, groepDeelnemers }: Props) {
  const [view, setView] = useState<"pre" | "groep">("pre");

  const preAantal = preDeelnemers.filter((d) => d.heeftIngevuld).length;
  const groepAantal = groepDeelnemers.filter((d) => d.heeftIngevuld).length;
  const total = preDeelnemers.length;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView("pre")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            view === "pre"
              ? "bg-oranje-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Pre-pool ({preAantal}/{total})
        </button>
        <button
          onClick={() => setView("groep")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            view === "groep"
              ? "bg-oranje-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Groepsfase ({groepAantal}/{total})
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-600 font-medium">Naam</th>
              <th className="text-center py-2 px-3 text-gray-600 font-medium">Status</th>
              {view === "pre" && (
                <th className="text-right py-2 px-3 text-gray-600 font-medium">Ingevuld op</th>
              )}
            </tr>
          </thead>
          <tbody>
            {view === "pre"
              ? preDeelnemers.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-900">{d.display_name}</td>
                    <td className="py-2 px-3 text-center">
                      {d.heeftIngevuld ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          ✓ Ingevuld
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
                          Niet ingevuld
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-500">
                      {d.ingevuldOp
                        ? new Date(d.ingevuldOp).toLocaleString("nl-NL", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Europe/Amsterdam",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              : groepDeelnemers.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-900">{d.display_name}</td>
                    <td className="py-2 px-3 text-center">
                      {d.heeftIngevuld ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          ✓ Ingevuld
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
                          Niet ingevuld
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
