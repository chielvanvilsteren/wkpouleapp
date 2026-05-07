"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Prediction, Score } from "@/types";
import { toArray } from "@/lib/scoring-utils";

type Props = {
  initialPrediction: Prediction | null;
  isOpen: boolean;
  score: Score | null;
  deadline?: string | null;
};

function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = Math.round((filled / total) * 100);
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-oranje-500 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
        {filled} / {total}
      </span>
    </div>
  );
}

function PlayerGrid({
  values,
  onChange,
  prefix,
  disabled,
}: {
  values: string[];
  onChange: (idx: number, val: string) => void;
  prefix: string;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {values.map((val, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-6 text-right shrink-0">
            {idx + 1}.
          </span>
          <input
            type="text"
            value={val}
            onChange={(e) => onChange(idx, e.target.value)}
            disabled={disabled}
            className="input-field text-sm"
            placeholder={`${prefix} ${idx + 1}`}
          />
        </div>
      ))}
    </div>
  );
}

export default function PredictieForm({
  initialPrediction,
  isOpen,
  score,
  deadline,
}: Props) {
  const [selectie, setSelectie] = useState<string[]>(
    toArray(initialPrediction?.selectie, 26),
  );
  const [basisXi, setBasisXi] = useState<string[]>(
    toArray(initialPrediction?.basis_xi, 11),
  );

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const canEdit = isOpen;
  const filledSelectie = selectie.filter((s) => s.trim() !== "").length;
  const filledBasisXi = basisXi.filter((s) => s.trim() !== "").length;

  const updateSelectie = useCallback((idx: number, val: string) => {
    setSelectie((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }, []);

  const updateBasisXi = useCallback((idx: number, val: string) => {
    setBasisXi((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    setErrorMsg("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg("Niet ingelogd.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      selectie: selectie.map((s) => s.trim()),
      basis_xi: basisXi.map((s) => s.trim()),
      is_definitief: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("predictions")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      setErrorMsg(error.message);
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }

    setSaving(false);
  };

  return (
    <div className="space-y-8">
      {/* Score banner */}
      {score && (
        <div className="bg-gradient-to-r from-knvb-500 to-knvb-600 text-white rounded-xl p-5">
          <div className="text-sm text-white/70 mb-1">Pre-pool score</div>
          <div className="flex items-end gap-6">
            <div>
              <span className="text-4xl font-bold">{score.totaal}</span>
              <span className="text-white/70 ml-1">/ 37</span>
            </div>
            <div className="text-sm text-white/80 space-y-0.5">
              <div>
                Selectie: <strong>{score.selectie_punten}</strong> / 26
              </div>
              <div>
                Basis XI: <strong>{score.basis_xi_punten}</strong> / 11
              </div>
            </div>
          </div>
        </div>
      )}

      {!isOpen && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg text-sm font-medium">
          ⚠️ Inzendingen zijn gesloten. Je kunt je voorspelling niet meer
          aanpassen.
        </div>
      )}

      {/* Sectie A: Selectie */}
      <div className="card">
        <h2 className="section-title">
          Sectie A — Officiële Selectie (26 spelers)
        </h2>
        <ProgressBar filled={filledSelectie} total={26} />
        <PlayerGrid
          values={selectie}
          onChange={updateSelectie}
          prefix="Speler"
          disabled={!canEdit}
        />
      </div>

      {/* Sectie B: Basis XI */}
      <div className="card">
        <h2 className="section-title">
          Sectie B — Basis XI vs. Japan (11 spelers)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Volgorde maakt niet uit — welke 11 spelers staan er in de basis?
        </p>
        <ProgressBar filled={filledBasisXi} total={11} />
        <PlayerGrid
          values={basisXi}
          onChange={updateBasisXi}
          prefix="Speler"
          disabled={!canEdit}
        />
      </div>

      {/* Save button */}
      {canEdit && (
        <div className="flex flex-col items-center gap-3">
          {deadline && (
            <p className="text-sm text-gray-500 text-center">
              Je kunt je selectie wijzigen tot{" "}
              <strong>
                {new Date(deadline).toLocaleString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Amsterdam",
                })}
              </strong>
              . Na de deadline zijn aanpassingen niet meer mogelijk.
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-base px-8 py-3 w-full sm:w-auto"
          >
            {saving ? "Opslaan..." : "💾 Opslaan"}
          </button>
          {saveStatus === "saved" && (
            <div className="bg-green-50 border border-green-300 text-green-700 px-6 py-3 rounded-lg font-medium">
              Voorspelling opgeslagen ✅
            </div>
          )}
          {saveStatus === "error" && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-lg text-sm">
              Fout bij opslaan: {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
