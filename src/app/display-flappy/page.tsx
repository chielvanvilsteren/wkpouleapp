import { createClient as createServiceClient } from "@supabase/supabase-js";
import DisplayRefresh from "../display/DisplayRefresh";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function DisplayFlappyPage() {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: allScores } = await admin
    .from("flappy_scores")
    .select("user_id, score")
    .order("score", { ascending: false })
    .limit(500);

  const bestMap = new Map<string, number>();
  for (const s of (allScores ?? []) as { user_id: string; score: number }[]) {
    if (!bestMap.has(s.user_id) || s.score > bestMap.get(s.user_id)!) {
      bestMap.set(s.user_id, s.score);
    }
  }

  type Entry = { user_id: string; display_name: string; best_score: number };
  const entries: Entry[] = [];

  if (bestMap.size > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", Array.from(bestMap.keys()));

    const nameMap = new Map(
      ((profiles ?? []) as { id: string; display_name: string }[]).map(
        (p) => [p.id, p.display_name],
      ),
    );

    Array.from(bestMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([uid, score]) => {
        entries.push({
          user_id: uid,
          display_name: nameMap.get(uid) ?? "Onbekend",
          best_score: score,
        });
      });
  }

  return (
    <div className="min-h-screen bg-knvb-500 flex flex-col">
      <DisplayRefresh />

      <div className="text-center py-8 px-4">
        <div className="text-5xl mb-2">⚽</div>
        <h1 className="text-4xl font-bold text-white tracking-wide">
          Flappy Bal
        </h1>
        <p className="text-white/50 text-sm mt-1">Beste score per speler</p>
      </div>

      <div className="flex-1 px-4 pb-8 max-w-xl mx-auto w-full">
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead>
              <tr className="bg-oranje-500 text-white">
                <th className="px-6 py-4 text-left w-16 text-lg">#</th>
                <th className="px-6 py-4 text-left text-lg">Naam</th>
                <th className="px-6 py-4 text-right text-lg font-bold">Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    Nog geen scores
                  </td>
                </tr>
              ) : (
                entries.map((entry, idx) => (
                  <tr
                    key={entry.user_id}
                    className={`border-b border-gray-100 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } ${idx < 3 ? "bg-oranje-50" : ""}`}
                  >
                    <td className="px-6 py-4 text-center font-bold text-gray-400 text-xl">
                      {idx < 3 ? (
                        <span className="text-2xl">{MEDALS[idx]}</span>
                      ) : (
                        idx + 1
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 text-xl">
                      {entry.display_name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-oranje-600 text-3xl">
                        {entry.best_score}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center pb-4 text-white/40 text-sm">
        Vernieuwt automatisch elke 30 seconden
      </div>
    </div>
  );
}
