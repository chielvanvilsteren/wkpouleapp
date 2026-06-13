"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { matchPredictionPoints } from "@/lib/scoring-utils";
import type { Match, MatchPrediction, WkIncidentsPrediction } from "@/types";

type Props = {
  matches: Match[];
  initialPredictions: MatchPrediction[];
  initialIncidents: WkIncidentsPrediction | null;
  isOpen: boolean;     // group stage: admin toggle + deadline
  adminOpen?: boolean; // knockout stage: admin toggle only (no deadline), defaults to true
  now: string; // ISO from server — avoids client clock drift
  selectie?: string[]; // admin-ingevulde NL selectie, leeg = vrij tekstveld
};

const STAGE_LABELS: Record<string, string> = {
  group: "Groepsfase",
  r32: "Ronde van 32",
  r16: "Ronde van 16",
  qf: "Kwartfinales",
  sf: "Halve finales",
  "3rd": "3e plaatswedstrijd",
  final: "Finale",
};

function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      value={value}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
      disabled={disabled}
      className="w-14 text-center input-field text-lg font-bold px-1 py-1"
    />
  );
}

function PlayerSelect({
  value,
  onChange,
  disabled,
  placeholder,
  selectie,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder: string;
  selectie: string[];
}) {
  if (selectie.length === 0) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input-field"
        placeholder={placeholder}
      />
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="input-field bg-white"
    >
      <option value="">— Kies een speler —</option>
      {selectie.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  );
}

function CountrySelect({
  value,
  onChange,
  disabled,
  placeholder,
  countries,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder: string;
  countries: string[];
}) {
  if (countries.length === 0) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input-field"
        placeholder={placeholder}
      />
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="input-field bg-white"
    >
      <option value="">— Kies een land —</option>
      {countries.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  );
}

function matchHasActualScore(match: Match) {
  return match.is_finished && match.home_score !== null && match.away_score !== null;
}

function resultTone(points: number | null) {
  if (points === 3) {
    return {
      row: "bg-emerald-50 hover:bg-emerald-100/80",
      badge: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
      result: "text-emerald-800",
    };
  }
  if (points === 1) {
    return {
      row: "bg-orange-50 hover:bg-orange-100/80",
      badge: "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
      result: "text-orange-800",
    };
  }
  if (points === 0) {
    return {
      row: "bg-red-50 hover:bg-red-100/80",
      badge: "bg-red-100 text-red-800 ring-1 ring-red-200",
      result: "text-red-800",
    };
  }
  return {
    row: "hover:bg-gray-50",
    badge: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
    result: "text-gray-500",
  };
}

export default function WkPouleForm({
  matches,
  initialPredictions,
  initialIncidents,
  isOpen,
  adminOpen = true,
  now,
  selectie = [],
}: Props) {
  // Build prediction map: match_id → {home, away}
  const initMap = new Map(
    initialPredictions.map((p) => [
      p.match_id,
      { home: p.home_score, away: p.away_score },
    ]),
  );
  const [scores, setScores] = useState<
    Map<number, { home: number; away: number }>
  >(
    new Map(
      matches.map((m) => [m.id, initMap.get(m.id) ?? { home: 0, away: 0 }]),
    ),
  );
  const [savedPredictionMatchIds, setSavedPredictionMatchIds] = useState(
    () => new Set(initialPredictions.map((p) => p.match_id)),
  );

  const [rodeKaart, setRodeKaart] = useState(
    initialIncidents?.rode_kaart ?? "",
  );
  const [geleKaart, setGeleKaart] = useState(
    initialIncidents?.gele_kaart ?? "",
  );
  const [geblesseerde, setGeblesseerde] = useState(
    initialIncidents?.geblesseerde ?? "",
  );
  const [eersteGoalNl, setEersteGoalNl] = useState(
    initialIncidents?.eerste_goal_nl ?? "",
  );
  const [topscorerWk, setTopscorerWk] = useState(
    initialIncidents?.topscorer_wk ?? "",
  );
  const [wereldkampioen, setWereldkampioen] = useState(
    initialIncidents?.wereldkampioen ?? "",
  );
  const [finaleTeam1, setFinaleTeam1] = useState(
    initialIncidents?.finale_team1 ?? "",
  );
  const [finaleTeam2, setFinaleTeam2] = useState(
    initialIncidents?.finale_team2 ?? "",
  );

  const countriesSet = useMemo(() => {
    const groupStageTeams = matches
      .filter((m) => m.stage === "group")
      .flatMap((m) => [m.home_team, m.away_team]);
    return new Set(groupStageTeams);
  }, [matches]);
  const countries = useMemo(
    () => Array.from(countriesSet).sort((a, b) => a.localeCompare(b, "nl")),
    [countriesSet],
  );
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(["group-A"]),
  );

  const setScore = (matchId: number, side: "home" | "away", val: number) => {
    setScores((prev) => {
      const next = new Map(prev);
      const cur = next.get(matchId)!;
      next.set(matchId, { ...cur, [side]: val });
      return next;
    });
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

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

    // Save all match predictions
    const matchPayloads = matches.map((m) => ({
      user_id: user.id,
      match_id: m.id,
      home_score: scores.get(m.id)!.home,
      away_score: scores.get(m.id)!.away,
    }));

    const { error: matchError } = await supabase
      .from("match_predictions")
      .upsert(matchPayloads, { onConflict: "user_id,match_id" });

    if (matchError) {
      setErrorMsg(matchError.message);
      setSaveStatus("error");
      setSaving(false);
      return;
    }

    // Save incidents
    const incidentsPayload = {
      user_id: user.id,
      rode_kaart: rodeKaart.trim(),
      gele_kaart: geleKaart.trim(),
      geblesseerde: geblesseerde.trim(),
      eerste_goal_nl: eersteGoalNl.trim(),
      topscorer_wk: topscorerWk.trim(),
      wereldkampioen: wereldkampioen.trim(),
      finale_team1: finaleTeam1.trim(),
      finale_team2: finaleTeam2.trim(),
      updated_at: new Date().toISOString(),
    };

    const { error: incidentsError } = await supabase
      .from("wk_incidents_predictions")
      .upsert(incidentsPayload, { onConflict: "user_id" });

    if (incidentsError) {
      setErrorMsg(incidentsError.message);
      setSaveStatus("error");
      setSaving(false);
      return;
    }

    setSavedPredictionMatchIds(new Set(matches.map((m) => m.id)));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 4000);
    setSaving(false);
  };

  // Group matches by stage + group
  const grouped: { key: string; label: string; matches: Match[] }[] = [];
  const stageOrder = ["group", "r32", "r16", "qf", "sf", "3rd", "final"];

  for (const stage of stageOrder) {
    const stageMatches = matches.filter((m) => m.stage === stage);
    if (stageMatches.length === 0) continue;

    if (stage === "group") {
      const groups = Array.from(
        new Set(stageMatches.map((m) => m.group_name).filter(Boolean)),
      ).sort() as string[];
      for (const g of groups) {
        grouped.push({
          key: `group-${g}`,
          label: `Groep ${g}`,
          matches: stageMatches.filter((m) => m.group_name === g),
        });
      }
    } else {
      grouped.push({
        key: stage,
        label: STAGE_LABELS[stage],
        matches: stageMatches,
      });
    }
  }

  const canEdit = isOpen;
  const nowMs = new Date(now).getTime();
  const matchKickoff = (match: Match) => {
    if (match.match_time) {
      return new Date(`${match.match_date}T${match.match_time}`).getTime();
    }
    return new Date(match.match_date).getTime();
  };
  const knockoutTeamsKnown = (match: Match) =>
    countriesSet.has(match.home_team) && countriesSet.has(match.away_team);
  const matchIsOpen = (match: Match) => {
    if (match.stage === "group") {
      // Group stage: open until global deadline, no per-match kickoff lock
      return isOpen;
    }
    // Knockout: no global deadline, teams must be known, lock 15 min before kick-off
    return adminOpen && knockoutTeamsKnown(match) && matchKickoff(match) - 15 * 60 * 1000 > nowMs;
  };
  const progressMatches = matches.filter((m) => m.stage === "group");
  const filledMatches = progressMatches.filter((m) =>
    savedPredictionMatchIds.has(m.id),
  ).length;
  const progressTotal = progressMatches.length;

  const [puntenOpen, setPuntenOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Puntenverdeling */}
      <div className="card p-0 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setPuntenOpen((v) => !v)}
        >
          <span>📊 Puntenverdeling</span>
          <span className="text-gray-400 text-xs">{puntenOpen ? "▲" : "▼"}</span>
        </button>
        {puntenOpen && (
          <div className="px-5 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-gray-100">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Wedstrijden</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-1 text-gray-700">Exact score</td><td className="py-1 text-right font-semibold text-oranje-600">3 pt</td></tr>
                  <tr><td className="py-1 text-gray-700">Juist resultaat</td><td className="py-1 text-right font-semibold text-oranje-600">1 pt</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">NL Incidenten</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-1 text-gray-700">🟥 Rode kaart — juiste speler</td><td className="py-1 text-right font-semibold text-oranje-600">30 pt</td></tr>
                  <tr><td className="py-1 text-gray-700">🟥 Rode kaart — leeg + geen</td><td className="py-1 text-right font-semibold text-oranje-600">10 pt</td></tr>
                  <tr><td className="py-1 text-gray-700">🟨 Gele kaart — juiste speler</td><td className="py-1 text-right font-semibold text-oranje-600">10 pt</td></tr>
                  <tr><td className="py-1 text-gray-700">🩹 Geblesseerde — juiste speler</td><td className="py-1 text-right font-semibold text-oranje-600">30 pt</td></tr>
                  <tr><td className="py-1 text-gray-700">🩹 Geblesseerde — leeg + geen</td><td className="py-1 text-right font-semibold text-oranje-600">10 pt</td></tr>
                  <tr><td className="py-1 text-gray-700">⚽ Eerste doelpunt NL</td><td className="py-1 text-right font-semibold text-oranje-600">10 pt</td></tr>
                  <tr><td className="py-1 text-gray-700">🏆 Topscorer WK</td><td className="py-1 text-right font-semibold text-oranje-600">20 pt</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Toernooi</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-1 text-gray-700">🌍 Wereldkampioen</td><td className="py-1 text-right font-semibold text-oranje-600">30 pt</td></tr>
                  <tr><td className="py-1 text-gray-700">🏟️ Finalist (per land)</td><td className="py-1 text-right font-semibold text-oranje-600">10 pt</td></tr>
                  <tr><td className="py-1 text-gray-700">🏟️ Beide finalisten correct</td><td className="py-1 text-right font-semibold text-oranje-600">+10 bonus</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {!isOpen && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg text-sm font-medium">
          ⚠️ WK Poule is gesloten. Voorspellingen kunnen niet meer aangepast
          worden.
        </div>
      )}

      {/* Progress */}
      <div className="card py-3 px-5 flex items-center gap-4">
        <div className="flex-1 bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-oranje-500 h-2.5 rounded-full transition-all duration-300"
            style={{
              width: `${progressTotal === 0 ? 0 : Math.round((filledMatches / progressTotal) * 100)}%`,
            }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {filledMatches} / {progressTotal} groepswedstrijden ingevuld
        </span>
      </div>

      {/* Match sections */}
      {grouped.map(({ key, label, matches: groupMatches }) => (
        <div key={key} className="card p-0 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 bg-knvb-500 text-white font-semibold hover:bg-knvb-600 transition-colors"
            onClick={() => toggleGroup(key)}
          >
            <span>{label}</span>
            <span className="text-white/70 text-sm">
              {openGroups.has(key) ? "▲" : "▼"}
            </span>
          </button>

          {openGroups.has(key) && (
            <div className="divide-y divide-gray-100">
              {groupMatches.map((match) => {
                const s = scores.get(match.id)!;
                const hasActualScore = matchHasActualScore(match);
                const points = hasActualScore
                  ? matchPredictionPoints(
                      { home_score: s.home, away_score: s.away },
                      { home_score: match.home_score, away_score: match.away_score },
                    )
                  : null;
                const tone = resultTone(points);
                return (
                  <div
                    key={match.id}
                    data-testid={`match-row-${match.id}`}
                    className={`flex flex-wrap items-center gap-2 px-4 py-3 transition-colors sm:flex-nowrap ${tone.row}`}
                  >
                    <span className="text-xs text-gray-400 w-16 shrink-0">
                      {new Date(match.match_date).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Europe/Amsterdam",
                      })}
                      {match.match_time && (
                        <span className="block text-gray-300">
                          {match.match_time.slice(0, 5)}
                        </span>
                      )}
                    </span>
                    <span className={`flex-1 text-sm font-medium text-right truncate ${match.stage !== "group" && !knockoutTeamsKnown(match) ? "text-gray-400 italic" : "text-gray-800"}`}>
                      {match.home_team}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <ScoreInput
                        value={s.home}
                        onChange={(v) => setScore(match.id, "home", v)}
                        disabled={!matchIsOpen(match)}
                      />
                      <span className="text-gray-400 font-bold">—</span>
                      <ScoreInput
                        value={s.away}
                        onChange={(v) => setScore(match.id, "away", v)}
                        disabled={!matchIsOpen(match)}
                      />
                    </div>
                    <span className={`flex-1 text-sm font-medium text-left truncate ${match.stage !== "group" && !knockoutTeamsKnown(match) ? "text-gray-400 italic" : "text-gray-800"}`}>
                      {match.away_team}
                    </span>
                    <div className="ml-[4.5rem] flex basis-full items-center justify-end gap-2 sm:ml-0 sm:basis-auto">
                      {hasActualScore ? (
                        <>
                          <div className="w-16 shrink-0 text-right">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              Uitslag
                            </div>
                            <div className={`text-sm font-black tabular-nums ${tone.result}`}>
                              {match.home_score}-{match.away_score}
                            </div>
                          </div>
                          <span
                            className={`inline-flex w-14 shrink-0 items-center justify-center rounded-full px-2 py-1 text-xs font-black tabular-nums ${tone.badge}`}
                          >
                            {points} pt
                          </span>
                        </>
                      ) : (
                        <div className="hidden w-16 shrink-0 text-right text-xs text-gray-300 sm:block">
                          -
                        </div>
                      )}
                    </div>
                    {!matchIsOpen(match) && (
                      match.stage !== "group" && !knockoutTeamsKnown(match)
                        ? <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">nog niet bekend</span>
                        : <span className="text-xs text-gray-400 shrink-0">🔒</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* NL Incidents */}
      <div className="card">
        <h2 className="section-title">NL Incidenten & Topscorer</h2>
        <p className="text-sm text-gray-500 mb-4">
          Rode kaart / geblesseerde leeg laten: <strong>10 punten</strong> als er niemand is. Juiste speler: <strong>30 punten</strong>. Overige incidenten: <strong>10 punten</strong>. Topscorer WK: <strong>20 punten</strong>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🟥 Eerste Rode Kaart NL{" "}
              <span className="text-gray-400 font-normal">(leeg = niemand)</span>
            </label>
            <PlayerSelect
              value={rodeKaart}
              onChange={setRodeKaart}
              disabled={!canEdit}
              placeholder="Leeglaten = niemand"
              selectie={selectie}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🟨 Eerste Gele Kaart NL{" "}
              <span className="text-gray-400 font-normal">(optioneel)</span>
            </label>
            <PlayerSelect
              value={geleKaart}
              onChange={setGeleKaart}
              disabled={!canEdit}
              placeholder="Spelernaam"
              selectie={selectie}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🩹 Eerste Geblesseerde NL{" "}
              <span className="text-gray-400 font-normal">(leeg = niemand)</span>
            </label>
            <PlayerSelect
              value={geblesseerde}
              onChange={setGeblesseerde}
              disabled={!canEdit}
              placeholder="Leeglaten = niemand"
              selectie={selectie}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ⚽ Eerste Doelpunt NL
            </label>
            <PlayerSelect
              value={eersteGoalNl}
              onChange={setEersteGoalNl}
              disabled={!canEdit}
              placeholder="Spelernaam"
              selectie={selectie}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🏆 Topscorer WK{" "}
              <span className="text-gray-400 font-normal">(alle landen)</span>
            </label>
            <input
              type="text"
              value={topscorerWk}
              onChange={(e) => setTopscorerWk(e.target.value)}
              disabled={!canEdit}
              className="input-field"
              placeholder="Spelersnaam + land"
            />
          </div>
        </div>
      </div>

      {/* Toernooi voorspellingen */}
      <div className="card">
        <h2 className="section-title">Toernooi Voorspellingen</h2>
        <p className="text-sm text-gray-500 mb-4">
          Wereldkampioen: <strong>30 punten</strong>. Finalisten: <strong>10 punten</strong> per correct land, <strong>+10 bonus</strong> als beide goed.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🌍 Wereldkampioen
            </label>
            <CountrySelect
              value={wereldkampioen}
              onChange={setWereldkampioen}
              disabled={!canEdit}
              placeholder="Land"
              countries={countries}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🏟️ Finalist 1
            </label>
            <CountrySelect
              value={finaleTeam1}
              onChange={setFinaleTeam1}
              disabled={!canEdit}
              placeholder="Land"
              countries={countries}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🏟️ Finalist 2
            </label>
            <CountrySelect
              value={finaleTeam2}
              onChange={setFinaleTeam2}
              disabled={!canEdit}
              placeholder="Land"
              countries={countries}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      {canEdit && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="btn-primary text-base px-8 py-3 w-full sm:w-auto"
          >
            {saving ? "Opslaan..." : "💾 Opslaan"}
          </button>
          {saveStatus === "saved" && (
            <div className="bg-blue-50 border border-blue-300 text-blue-700 px-6 py-3 rounded-lg font-medium">
              Opgeslagen ✅
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
