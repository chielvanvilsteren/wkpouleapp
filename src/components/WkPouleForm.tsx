"use client";

import { Fragment, useState, useMemo } from "react";
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

const SHORT_STAGE_LABELS: Record<string, string> = {
  r32: "R32",
  r16: "R16",
  qf: "KF",
  sf: "HF",
  "3rd": "3e",
  final: "Finale",
};

// Het WK 2026 valt in juni/juli, dus Nederlandse tijden zijn CEST.
const CEST_OFFSET_HOURS = 2;

const amsterdamDateFormatter = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Amsterdam",
});

const amsterdamDateKeyFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Amsterdam",
});

function matchDateKey(match: Pick<Match, "match_date">) {
  return match.match_date.slice(0, 10);
}

function matchTimeKey(match: Pick<Match, "match_time">) {
  return (match.match_time ?? "00:00:00").slice(0, 8);
}

function amsterdamDateTimeToUtcMs(match: Pick<Match, "match_date" | "match_time">) {
  const [year, month, day] = matchDateKey(match).split("-").map(Number);
  const [hour = 0, minute = 0, second = 0] = matchTimeKey(match).split(":").map(Number);

  return Date.UTC(year, month - 1, day, hour, minute, second)
    - CEST_OFFSET_HOURS * 60 * 60 * 1000;
}

function formatMatchDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return amsterdamDateFormatter.format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function dateKeyToUtcDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function dateHeaderLabel(dateKey: string, nowIso: string) {
  const todayKey = amsterdamDateKeyFormatter.format(new Date(nowIso));
  const dayDiff = Math.round((dateKeyToUtcDay(dateKey) - dateKeyToUtcDay(todayKey)) / 86_400_000);
  const formatted = formatMatchDate(dateKey);

  if (dayDiff === -1) return `Gisteren · ${formatted}`;
  if (dayDiff === 0) return `Vandaag · ${formatted}`;
  if (dayDiff === 1) return `Morgen · ${formatted}`;
  return formatted;
}

function stageLabel(match: Match) {
  if (match.stage === "group") return `Groep ${match.group_name ?? "-"}`;
  return STAGE_LABELS[match.stage] ?? match.stage;
}

function shortStageLabel(match: Match) {
  if (match.stage === "group") return `Groep ${match.group_name ?? "-"}`;
  return SHORT_STAGE_LABELS[match.stage] ?? match.stage;
}

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

function csvCell(value: string | number | null) {
  if (value === null || value === "") return "";
  const text = String(value).replace(/\r?\n/g, " ");
  if (/[",;\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}\r\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

  const setScore = (matchId: number, side: "home" | "away", val: number) => {
    setScores((prev) => {
      const next = new Map(prev);
      const cur = next.get(matchId)!;
      next.set(matchId, { ...cur, [side]: val });
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

  const canEdit = isOpen;
  const nowMs = new Date(now).getTime();
  const chronologicalMatches = useMemo(() => {
    let previousDateKey = "";

    return [...matches]
      .sort((a, b) => amsterdamDateTimeToUtcMs(a) - amsterdamDateTimeToUtcMs(b) || a.match_number - b.match_number)
      .map((match) => {
        const dateKey = matchDateKey(match);
        const startsNewDate = dateKey !== previousDateKey;
        previousDateKey = dateKey;

        return { match, dateKey, startsNewDate };
      });
  }, [matches]);
  const knockoutTeamsKnown = (match: Match) =>
    countriesSet.has(match.home_team) && countriesSet.has(match.away_team);
  const matchIsOpen = (match: Match) => {
    if (match.stage === "group") {
      // Group stage: open until global deadline, no per-match kickoff lock
      return isOpen;
    }
    // Knockout: no global deadline, teams must be known, lock 15 min before kick-off
    return adminOpen && knockoutTeamsKnown(match) && amsterdamDateTimeToUtcMs(match) - 15 * 60 * 1000 > nowMs;
  };
  const progressMatches = matches.filter((m) => m.stage === "group");
  const filledMatches = progressMatches.filter((m) =>
    savedPredictionMatchIds.has(m.id),
  ).length;
  const progressTotal = progressMatches.length;

  const handleCsvExport = () => {
    const rows: (string | number | null)[][] = [
      [
        "Wedstrijdnummer",
        "Datum",
        "Tijd",
        "Fase",
        "Thuis",
        "Uit",
        "Voorspelling thuis",
        "Voorspelling uit",
        "Uitslag thuis",
        "Uitslag uit",
        "Punten",
        "Status",
      ],
    ];

    for (const { match, dateKey } of chronologicalMatches) {
      const s = scores.get(match.id)!;
      const hasActualScore = matchHasActualScore(match);
      const points = hasActualScore
        ? matchPredictionPoints(
            { home_score: s.home, away_score: s.away },
            { home_score: match.home_score, away_score: match.away_score },
          )
        : null;
      const status = match.is_finished
        ? "Afgerond"
        : match.is_live
          ? "Live"
          : "Nog te spelen";

      rows.push([
        match.match_number,
        dateKey,
        match.match_time ? match.match_time.slice(0, 5) : "",
        stageLabel(match),
        match.home_team,
        match.away_team,
        s.home,
        s.away,
        hasActualScore ? match.home_score : null,
        hasActualScore ? match.away_score : null,
        points,
        status,
      ]);
    }

    downloadCsv("wk-poule-wedstrijden.csv", rows);
  };

  return (
    <div className="space-y-6">
      {/* Puntenverdeling */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">📊 Puntenverdeling</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
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

      {/* Wedstrijden */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-800">Wedstrijden</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-400">Nederlandse tijd</span>
              <button
                type="button"
                onClick={handleCsvExport}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-oranje-500 focus:ring-offset-2"
              >
                CSV export
              </button>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {chronologicalMatches.map(({ match, dateKey, startsNewDate }) => {
            const s = scores.get(match.id)!;
            const hasActualScore = matchHasActualScore(match);
            const points = hasActualScore
              ? matchPredictionPoints(
                  { home_score: s.home, away_score: s.away },
                  { home_score: match.home_score, away_score: match.away_score },
                )
              : null;
            const tone = resultTone(points);
            const teamsKnown = match.stage === "group" || knockoutTeamsKnown(match);
            const open = matchIsOpen(match);

            return (
              <Fragment key={match.id}>
                {startsNewDate && (
                  <div className="bg-knvb-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-white sm:px-5">
                    {dateHeaderLabel(dateKey, now)}
                  </div>
                )}
                <div
                  data-testid={`match-row-${match.id}`}
                  className={`flex flex-wrap items-center gap-2 px-3 py-3 transition-colors sm:flex-nowrap sm:px-4 ${tone.row}`}
                >
                  <span className="w-16 shrink-0 text-left">
                    <span className="block text-sm font-black tabular-nums text-gray-700">
                      {match.match_time ? match.match_time.slice(0, 5) : "--:--"}
                    </span>
                    <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400" title={stageLabel(match)}>
                      {shortStageLabel(match)}
                    </span>
                  </span>
                  <span className={`flex-1 truncate text-right text-sm font-medium ${teamsKnown ? "text-gray-800" : "italic text-gray-400"}`}>
                    {match.home_team}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <ScoreInput
                      value={s.home}
                      onChange={(v) => setScore(match.id, "home", v)}
                      disabled={!open}
                    />
                    <span className="font-bold text-gray-400">—</span>
                    <ScoreInput
                      value={s.away}
                      onChange={(v) => setScore(match.id, "away", v)}
                      disabled={!open}
                    />
                  </div>
                  <span className={`flex-1 truncate text-left text-sm font-medium ${teamsKnown ? "text-gray-800" : "italic text-gray-400"}`}>
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
                    ) : match.is_live ? (
                      <span className="inline-flex w-14 shrink-0 items-center justify-center rounded-full bg-orange-100 px-2 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-200">
                        Live
                      </span>
                    ) : (
                      <div className="hidden w-16 shrink-0 text-right text-xs text-gray-300 sm:block">
                        -
                      </div>
                    )}
                  </div>
                  {!open && (
                    !teamsKnown
                      ? <span className="shrink-0 whitespace-nowrap text-xs text-gray-400">nog niet bekend</span>
                      : <span className="shrink-0 text-xs text-gray-400">🔒</span>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

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
