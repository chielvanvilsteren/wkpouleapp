"use client";

import { useState } from "react";

type HealthResult = {
  reachable: boolean;
  error: string | null;
  quota_remaining: number | null;
  quota_reset_seconds: number | null;
  response_ms: number | null;
};

export default function AdminFootballHealth() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<HealthResult | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const check = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/football-health");
      const data: HealthResult = await res.json();
      setResult(data);
    } catch {
      setResult({
        reachable: false,
        error: "Kon de health check niet bereiken",
        quota_remaining: null,
        quota_reset_seconds: null,
        response_ms: null,
      });
    }
    setCheckedAt(new Date());
    setStatus("done");
  };

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4">
      <button
        onClick={check}
        disabled={status === "loading"}
        className="btn-secondary text-sm"
      >
        {status === "loading" ? "Controleren..." : "🔌 API Status Controleren"}
      </button>

      {status === "done" && result && (
        <div
          className={`flex-1 rounded-xl border px-4 py-3 text-sm ${
            result.reachable
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold mb-1">
            {result.reachable ? "✅ Bereikbaar" : "❌ Niet bereikbaar"}
            {result.response_ms !== null && (
              <span className="font-normal opacity-70 text-xs">
                {result.response_ms}ms
              </span>
            )}
          </div>
          {result.error && (
            <div className="text-xs opacity-80 mb-1">{result.error}</div>
          )}
          {result.quota_remaining !== null && (
            <div className="text-xs opacity-70">
              Quota: {result.quota_remaining}/10 req/min resterend
              {result.quota_reset_seconds !== null &&
                ` · reset over ${result.quota_reset_seconds}s`}
            </div>
          )}
          {checkedAt && (
            <div className="text-xs opacity-50 mt-0.5">
              Gecontroleerd om{" "}
              {checkedAt.toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "Europe/Amsterdam",
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
