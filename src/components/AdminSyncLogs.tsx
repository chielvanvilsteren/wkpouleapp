"use client";

import { useState } from "react";

export type SyncLog = {
  id: number;
  ran_at: string;
  status: "success" | "none" | "error";
  message: string;
  updated: number;
  skipped: number;
  unmatched: number;
  details: string[] | null;
  triggered_by: string;
};

type Props = {
  logs: SyncLog[];
};

const STATUS_CONFIG = {
  success: {
    icon: "✅",
    label: "Bijgewerkt",
    className: "bg-green-50 border-green-200 text-green-800",
  },
  none: {
    icon: "⏳",
    label: "Geen nieuws",
    className: "bg-gray-50 border-gray-200 text-gray-600",
  },
  error: {
    icon: "❌",
    label: "Fout",
    className: "bg-red-50 border-red-200 text-red-800",
  },
};

export default function AdminSyncLogs({ logs }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <div className="text-4xl mb-3">📭</div>
        Nog geen synchronisaties uitgevoerd.
        <p className="mt-1 text-xs">
          De cronjob draait dagelijks om 10:00. Je kunt ook handmatig
          synchroniseren via de knop bij &ldquo;Wedstrijduitslagen&rdquo;.
        </p>
      </div>
    );
  }

  const lastSuccess = logs.find((l) => l.status === "success");
  const lastRun = logs[0];

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <div className="text-xs text-gray-400 mb-0.5">Laatste sync</div>
          <div className="text-sm font-semibold text-gray-700">
            {new Date(lastRun.ran_at).toLocaleString("nl-NL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Amsterdam",
            })}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {lastRun.triggered_by === "admin"
              ? "👤 Handmatig"
              : "🤖 Automatisch"}
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <div className="text-xs text-gray-400 mb-0.5">
            Status laatste sync
          </div>
          <div
            className={`text-sm font-semibold ${lastRun.status === "success" ? "text-green-700" : lastRun.status === "error" ? "text-red-700" : "text-gray-600"}`}
          >
            {STATUS_CONFIG[lastRun.status].icon}{" "}
            {STATUS_CONFIG[lastRun.status].label}
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <div className="text-xs text-gray-400 mb-0.5">
            Laatste uitslagen bijgewerkt
          </div>
          <div className="text-sm font-semibold text-gray-700">
            {lastSuccess
              ? new Date(lastSuccess.ran_at).toLocaleString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Amsterdam",
                })
              : "—"}
          </div>
          {lastSuccess && (
            <div className="text-xs text-gray-400 mt-0.5">
              {lastSuccess.updated} uitslag
              {lastSuccess.updated !== 1 ? "en" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Log list */}
      <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
        {logs.map((log) => {
          const cfg = STATUS_CONFIG[log.status];
          const isExpanded = expandedId === log.id;
          const hasDetails = log.details && log.details.length > 0;

          return (
            <div
              key={log.id}
              className={`${cfg.className} border-l-4 border-l-current`}
            >
              <div
                className={`flex items-start gap-3 px-4 py-3 ${hasDetails ? "cursor-pointer hover:brightness-95" : ""}`}
                onClick={() =>
                  hasDetails && setExpandedId(isExpanded ? null : log.id)
                }
              >
                <span className="text-base mt-0.5 shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{cfg.label}</span>
                    {log.status === "success" && (
                      <span className="text-xs opacity-70">
                        {log.updated} bijgewerkt · {log.skipped} overgeslagen
                        {log.unmatched > 0
                          ? ` · ${log.unmatched} niet gekoppeld`
                          : ""}
                      </span>
                    )}
                    <span className="text-xs opacity-60 ml-auto shrink-0">
                      {log.triggered_by === "admin" ? "👤" : "🤖"}{" "}
                      {new Date(log.ran_at).toLocaleString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Amsterdam",
                      })}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 opacity-80 truncate">
                    {log.message}
                  </p>
                </div>
                {hasDetails && (
                  <span className="text-xs opacity-50 shrink-0 mt-0.5">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                )}
              </div>

              {isExpanded && hasDetails && (
                <div className="px-4 pb-3">
                  <ul className="bg-white/60 rounded-lg px-3 py-2 font-mono text-xs space-y-0.5">
                    {log.details!.map((line, i) => (
                      <li key={i} className="text-gray-600">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
