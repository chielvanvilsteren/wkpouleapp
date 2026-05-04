import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import DisplayRefresh from "./DisplayRefresh";
import type { Database, Profile, Score, WkScore } from "@/types";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

function Rank({ idx, showMedals }: { idx: number; showMedals: boolean }) {
  if (idx < 3 && showMedals)
    return <span className="text-xl">{MEDALS[idx]}</span>;
  return <>{idx + 1}</>;
}

export default async function DisplayPage() {
  const supabase = await createClient();

  const { data: uitslagRaw } = await supabase
    .from("master_uitslag")
    .select(
      "scores_zichtbaar, wk_scores_zichtbaar, inzendingen_deadline, wk_poule_deadline",
    )
    .eq("id", 1)
    .single();

  const uitslag = uitslagRaw as {
    scores_zichtbaar: boolean;
    wk_scores_zichtbaar: boolean;
    inzendingen_deadline: string | null;
    wk_poule_deadline: string | null;
  } | null;

  const scoresZichtbaar = uitslag?.scores_zichtbaar ?? false;
  const wkScoresZichtbaar = uitslag?.wk_scores_zichtbaar ?? false;
  const anyScores = scoresZichtbaar || wkScoresZichtbaar;

  const now = new Date();
  const preDeadlineVerstreken = uitslag?.inzendingen_deadline
    ? new Date(uitslag.inzendingen_deadline) <= now
    : false;
  const wkDeadlineVerstreken = uitslag?.wk_poule_deadline
    ? new Date(uitslag.wk_poule_deadline) <= now
    : false;

  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("is_deelnemer", true)
    .order("display_name", { ascending: true });

  const profiles = (profilesRaw ?? []) as Pick<
    Profile,
    "id" | "display_name"
  >[];
  const userIds = profiles.map((p) => p.id);

  const preIngevuldSet = new Set<string>();
  const wkIngevuldSet = new Set<string>();

  if (userIds.length > 0 && (!preDeadlineVerstreken || !wkDeadlineVerstreken)) {
    const admin = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    await Promise.all([
      !preDeadlineVerstreken
        ? admin
            .from("predictions")
            .select("user_id")
            .in("user_id", userIds)
            .then(({ data }) => {
              for (const r of data ?? []) preIngevuldSet.add(r.user_id);
            })
        : Promise.resolve(),
      !wkDeadlineVerstreken
        ? admin
            .from("wk_incidents_predictions")
            .select("user_id")
            .eq("is_definitief", true)
            .in("user_id", userIds)
            .then(({ data }) => {
              for (const r of data ?? []) wkIngevuldSet.add(r.user_id);
            })
        : Promise.resolve(),
    ]);
  }

  const preScoreMap = new Map<string, Score>();
  const wkScoreMap = new Map<string, WkScore>();

  if (userIds.length > 0) {
    await Promise.all([
      scoresZichtbaar
        ? supabase
            .from("scores")
            .select("*")
            .in("user_id", userIds)
            .then(({ data }) => {
              for (const s of data ?? [])
                preScoreMap.set(s.user_id, s as Score);
            })
        : Promise.resolve(),
      wkScoresZichtbaar
        ? supabase
            .from("wk_scores")
            .select("*")
            .in("user_id", userIds)
            .then(({ data }) => {
              for (const s of data ?? [])
                wkScoreMap.set(s.user_id, s as WkScore);
            })
        : Promise.resolve(),
    ]);
  }

  const baseEntries = profiles.map((p) => {
    const pre = preScoreMap.get(p.id);
    const wk = wkScoreMap.get(p.id);
    return {
      user_id: p.id,
      display_name: p.display_name,
      pre_totaal: pre?.totaal ?? 0,
      wk_totaal: wk?.totaal ?? 0,
      totaal: (pre?.totaal ?? 0) + (wk?.totaal ?? 0),
      pre_ingevuld: preIngevuldSet.has(p.id),
      wk_ingevuld: wkIngevuldSet.has(p.id),
    };
  });

  const byName = (a: { display_name: string }, b: { display_name: string }) =>
    a.display_name.localeCompare(b.display_name, "nl");

  const preEntries = [...baseEntries].sort((a, b) => {
    if (scoresZichtbaar && b.pre_totaal !== a.pre_totaal)
      return b.pre_totaal - a.pre_totaal;
    return byName(a, b);
  });

  const wkEntries = [...baseEntries].sort((a, b) => {
    if (wkScoresZichtbaar && b.wk_totaal !== a.wk_totaal)
      return b.wk_totaal - a.wk_totaal;
    return byName(a, b);
  });

  const totaalEntries = [...baseEntries].sort((a, b) => {
    if (anyScores && b.totaal !== a.totaal) return b.totaal - a.totaal;
    return byName(a, b);
  });

  const thCls = "px-4 py-3 text-center";
  const tdCls = "px-4 py-3 text-center";

  return (
    <div className="min-h-screen bg-knvb-500 flex flex-col">
      <DisplayRefresh />

      <div className="text-center py-5 px-4">
        <div className="text-4xl mb-1">🇳🇱</div>
        <h1 className="text-3xl font-bold text-white tracking-wide">
          Oranje Poule WK 2026
        </h1>
      </div>

      <div className="flex-1 px-4 pb-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Top row: Pre-poule + WK Poule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pre-poule */}
          <div className="flex flex-col">
            <h2 className="text-white font-bold text-xl text-center mb-3">
              Pre Poule
            </h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full">
                <thead>
                  <tr className="bg-oranje-500 text-white">
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Naam</th>
                    <th className={thCls + " font-bold"}>Punten</th>
                  </tr>
                </thead>
                <tbody>
                  {preEntries.map((entry, idx) => (
                    <tr
                      key={entry.user_id}
                      className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${idx < 3 && scoresZichtbaar ? "bg-oranje-50" : ""}`}
                    >
                      <td className="px-4 py-3 text-center font-bold text-gray-400">
                        <Rank idx={idx} showMedals={scoresZichtbaar} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {entry.display_name}
                      </td>
                      <td className={tdCls}>
                        {scoresZichtbaar ? (
                          <span className="font-bold text-oranje-600 text-xl">
                            {entry.pre_totaal}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* WK Poule */}
          <div className="flex flex-col">
            <h2 className="text-white font-bold text-xl text-center mb-3">
              WK Poule
            </h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full">
                <thead>
                  <tr className="bg-oranje-500 text-white">
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Naam</th>
                    <th className={thCls + " font-bold"}>Punten</th>
                  </tr>
                </thead>
                <tbody>
                  {wkEntries.map((entry, idx) => (
                    <tr
                      key={entry.user_id}
                      className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${idx < 3 && wkScoresZichtbaar ? "bg-oranje-50" : ""}`}
                    >
                      <td className="px-4 py-3 text-center font-bold text-gray-400">
                        <Rank idx={idx} showMedals={true} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {entry.display_name}
                      </td>
                      <td className={tdCls}>
                        {wkScoresZichtbaar ? (
                          <span className="font-bold text-oranje-600 text-xl">
                            {entry.wk_totaal}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom: Gecombineerd */}
        <div className="flex flex-col">
          <h2 className="text-white font-bold text-xl text-center mb-3">
            Gecombineerd
          </h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full">
              <thead>
                <tr className="bg-oranje-500 text-white">
                  <th className="px-4 py-3 text-left w-10">#</th>
                  <th className="px-4 py-3 text-left">Naam</th>
                  <th className={thCls}>Pre Poule</th>
                  <th className={thCls}>WK Poule</th>
                  <th className={thCls + " font-bold"}>Totaal</th>
                </tr>
              </thead>
              <tbody>
                {totaalEntries.map((entry, idx) => (
                  <tr
                    key={entry.user_id}
                    className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${idx < 3 && anyScores ? "bg-oranje-50" : ""}`}
                  >
                    <td className="px-4 py-3 text-center font-bold text-gray-400">
                      <Rank idx={idx} showMedals={anyScores} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {entry.display_name}
                    </td>
                    <td className={tdCls + " text-gray-600"}>
                      {scoresZichtbaar ? (
                        entry.pre_totaal
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className={tdCls + " text-gray-600"}>
                      {wkScoresZichtbaar ? (
                        entry.wk_totaal
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className={tdCls}>
                      {anyScores ? (
                        <span className="font-bold text-oranje-600 text-xl">
                          {entry.totaal}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="text-center pb-4 text-white/40 text-sm">
        Vernieuwt automatisch elke 30 seconden
      </div>
    </div>
  );
}
