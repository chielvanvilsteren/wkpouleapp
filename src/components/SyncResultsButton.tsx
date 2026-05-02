"use client";

import { useState } from "react";

interface SyncResult {
  updated?: number;
  skipped?: number;
  unmatched?: number;
  message?: string;
  error?: string;
  log?: string[];
}

type SyncStatus = "idle" | "loading" | "success" | "none" | "error";

export default function SyncResultsButton() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSync = async () => {
    setStatus("loading");
    setResult(null);
    setModalOpen(true);

    try {
      const res = await fetch("/api/sync-results", { method: "POST" });
      const data: SyncResult = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResult(data);
        return;
      }

      if (data.updated && data.updated > 0) {
        setStatus("success");
      } else if (data.error) {
        setStatus("error");
      } else {
        setStatus("none");
      }

      setResult(data);
    } catch (err) {
      setStatus("error");
      setResult({
        error:
          "Verbinding met de server mislukt. Controleer je internetverbinding.",
      });
    }
  };

  const close = () => {
    setModalOpen(false);
    if (status !== "loading") setStatus("idle");
  };

  return (
    <>
      <button
        onClick={handleSync}
        disabled={status === "loading"}
        className="btn-secondary text-sm flex items-center gap-2"
      >
        {status === "loading" ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Uitslagen ophalen...
          </>
        ) : (
          <>🔄 Uitslagen ophalen</>
        )}
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={status !== "loading" ? close : undefined}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            {/* Loading */}
            {status === "loading" && (
              <>
                <div className="flex items-center gap-3">
                  <svg
                    className="animate-spin h-5 w-5 text-knvb-500"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <h3 className="font-semibold text-gray-900">
                    Uitslagen ophalen...
                  </h3>
                </div>
                <p className="text-sm text-gray-500">
                  Football-Data.org wordt geraadpleegd.
                </p>
              </>
            )}

            {/* Success */}
            {status === "success" && result && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <h3 className="font-semibold text-gray-900">
                    {result.updated} uitslag{result.updated !== 1 ? "en" : ""}{" "}
                    bijgewerkt
                  </h3>
                </div>
                {result.unmatched !== undefined && result.unmatched > 0 && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠️ {result.unmatched} wedstrijd
                    {result.unmatched !== 1 ? "en" : ""} kon
                    {result.unmatched !== 1 ? "den" : ""} niet worden gekoppeld
                    aan de database.
                  </p>
                )}
                {result.log && result.log.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                      Logboek tonen
                    </summary>
                    <ul className="mt-2 space-y-0.5 bg-gray-50 rounded-lg p-3 font-mono">
                      {result.log.map((line, i) => (
                        <li key={i} className="text-gray-600">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <p className="text-xs text-gray-400">
                  Scores worden automatisch herberekend.
                </p>
              </>
            )}

            {/* None available */}
            {status === "none" && result && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏳</span>
                  <h3 className="font-semibold text-gray-900">
                    Geen nieuwe uitslagen
                  </h3>
                </div>
                <p className="text-sm text-gray-600">{result.message}</p>
                {result.skipped !== undefined && result.skipped > 0 && (
                  <p className="text-xs text-gray-400">
                    {result.skipped} wedstrijd
                    {result.skipped !== 1 ? "en waren" : " was"} al bijgewerkt.
                  </p>
                )}
              </>
            )}

            {/* Error */}
            {status === "error" && result && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">❌</span>
                  <h3 className="font-semibold text-gray-900">
                    Er ging iets mis
                  </h3>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
                  {result.error}
                </div>
                {result.log && result.log.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                      Logboek tonen
                    </summary>
                    <ul className="mt-2 space-y-0.5 bg-gray-50 rounded-lg p-3 font-mono">
                      {result.log.map((line, i) => (
                        <li key={i} className="text-gray-600">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}

            {status !== "loading" && (
              <button onClick={close} className="btn-secondary w-full mt-2">
                Sluiten
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
