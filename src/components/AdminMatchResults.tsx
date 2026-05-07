"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Match } from "@/types";
import SyncResultsButton from "@/components/SyncResultsButton";

type Props = { matches: Match[] };

const STAGE_LABELS: Record<string, string> = {
  group: "Groepsfase",
  r32: "Ronde van 32",
  r16: "Ronde van 16",
  qf: "Kwartfinales",
  sf: "Halve finales",
  "3rd": "3e plaatswedstrijd",
  final: "Finale",
};

export default function AdminMatchResults({ matches }: Props) {
  const [results, setResults] = useState<
    Map<number, { home: number | null; away: number | null; live: boolean; finished: boolean }>
  >(
    new Map(
      matches.map((m) => [
        m.id,
        { home: m.home_score, away: m.away_score, live: m.is_live, finished: m.is_finished },
      ]),
    ),
  );
  const [openStages, setOpenStages] = useState<Set<string>>(new Set(["group"]));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "saving" | "recalculating" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const setScore = (id: number, side: "home" | "away", val: string) => {
    setResults((prev) => {
      const next = new Map(prev);
      const cur = next.get(id)!;
      next.set(id, { ...cur, [side]: val === "" ? null : parseInt(val) });
      return next;
    });
  };

  const cycleStatus = (id: number) => {
    setResults((prev) => {
      const next = new Map(prev);
      const cur = next.get(id)!;
      if (!cur.live && !cur.finished) {
        next.set(id, { ...cur, live: true, finished: false });
      } else if (cur.live && !cur.finished) {
        next.set(id, { ...cur, live: false, finished: true });
      } else {
        next.set(id, { ...cur, live: false, finished: false });
      }
      return next;
    });
  };

  const toggleStage = (key: string) => {
    setOpenStages((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus("saving");
    setErrorMsg("");

    const supabase = createClient();

    for (const [id, r] of Array.from(results.entries())) {
      const { error } = await supabase
        .from("matches")
        .update({
          home_score: r.home,
          away_score: r.away,
          is_live: r.live,
          is_finished: r.finished,
        })
        .eq("id", id);
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        setSaving(false);
        return;
      }
    }

    setStatus("recalculating");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/wk-scores/recalculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorMsg(body.error ?? "Score berekening mislukt.");
      setStatus("error");
    } else {
      setStatus("success");
      setTimeout(() => setStatus("idle"), 5000);
    }
    setSaving(false);
  };

  const stageOrder = ["group", "r32", "r16", "qf", "sf", "3rd", "final"];

  return (
    <div className="space-y-4">
      {stageOrder.map((stage) => {
        const stageMatches = matches.filter((m) => m.stage === stage);
        if (stageMatches.length === 0) return null;
        const isOpen = openStages.has(stage);
        return (
          <div
            key={stage}
            className="border border-gray-200 rounded-xl overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors text-sm"
              onClick={() => toggleStage(stage)}
            >
              <span>{STAGE_LABELS[stage]}</span>
              <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && (
              <div className="divide-y divide-gray-100">
                {stageMatches.map((match) => {
                  const r = results.get(match.id)!;
                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <span className="text-xs text-gray-400 w-16 shrink-0">
                        {new Date(match.match_date).toLocaleDateString(
                          "nl-NL",
                          { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" },
                        )}
                      </span>
                      <span className="flex-1 text-sm text-right text-gray-700 truncate">
                        {match.home_team}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={r.home ?? ""}
                          onChange={(e) =>
                            setScore(match.id, "home", e.target.value)
                          }
                          className="w-12 text-center input-field text-sm font-bold px-1 py-1"
                          placeholder="—"
                        />
                        <span className="text-gray-400">—</span>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={r.away ?? ""}
                          onChange={(e) =>
                            setScore(match.id, "away", e.target.value)
                          }
                          className="w-12 text-center input-field text-sm font-bold px-1 py-1"
                          placeholder="—"
                        />
                      </div>
                      <span className="flex-1 text-sm text-left text-gray-700 truncate">
                        {match.away_team}
                      </span>
                      <button
                        onClick={() => cycleStatus(match.id)}
                        className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                          r.finished
                            ? "bg-green-100 text-green-700"
                            : r.live
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.finished ? "Afgerond" : r.live ? "Bezig" : "Nog te spelen"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {status === "saving" && "Uitslagen opslaan..."}
          {status === "recalculating" && "WK Scores berekenen..."}
          {(status === "idle" || status === "success" || status === "error") &&
            "Uitslagen Opslaan & Scores Herberekenen"}
        </button>
        <SyncResultsButton />
        {status === "success" && (
          <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
            ✅ Uitslagen opgeslagen en scores herberekend!
          </div>
        )}
        {status === "error" && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            ❌ Fout: {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
