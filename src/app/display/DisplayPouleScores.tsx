const MEDALS = ["🥇", "🥈", "🥉"];

export type DisplayPouleEntry = {
  user_id: string;
  display_name: string;
  pre_totaal: number;
  wk_totaal: number;
  dagscore: number;
  totaal: number;
};

function Rank({ idx, showMedals }: { idx: number; showMedals: boolean }) {
  if (idx < 3 && showMedals) return <span className="text-2xl">{MEDALS[idx]}</span>;
  return <span className="tabular-nums">{idx + 1}</span>;
}

function ScoreCell({
  value,
  muted = false,
  highlight = false,
}: {
  value: string | number;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-w-16 items-center justify-center rounded-lg px-3 py-1.5 font-black tabular-nums ${
        highlight
          ? "bg-oranje-500 text-white shadow-lg shadow-oranje-500/25"
          : muted
            ? "bg-gray-100 text-gray-400"
            : "bg-knvb-50 text-knvb-700"
      }`}
    >
      {value}
    </span>
  );
}

function formatDagscore(points: number) {
  return points > 0 ? `+${points}` : "0";
}

export default function DisplayPouleScores({
  entries,
  scoresZichtbaar,
  wkScoresZichtbaar,
}: {
  entries: DisplayPouleEntry[];
  scoresZichtbaar: boolean;
  wkScoresZichtbaar: boolean;
}) {
  const anyScores = scoresZichtbaar || wkScoresZichtbaar;

  return (
    <section className="px-4 pb-6 max-w-6xl mx-auto w-full">
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-knvb-900/30 ring-1 ring-white/30">
        <div className="bg-knvb-800 px-6 py-5 text-white">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Poulescores</h2>
              <p className="mt-1 text-sm font-medium text-white/55">
                Gecombineerde ranglijst
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
              <div className="text-xs font-bold uppercase tracking-wide text-white/45">
                Deelnemers
              </div>
              <div className="text-3xl font-black tabular-nums">{entries.length}</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-knvb-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 text-center w-20">#</th>
                <th className="px-5 py-3 text-left">Naam</th>
                <th className="px-5 py-3 text-center">Pre</th>
                <th className="px-5 py-3 text-center">WK</th>
                <th className="px-5 py-3 text-center">Dagscore</th>
                <th className="px-5 py-3 text-center">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const topRow = idx < 3 && anyScores;
                return (
                  <tr
                    key={entry.user_id}
                    className={`border-b border-gray-100 transition-colors last:border-b-0 ${
                      topRow ? "bg-oranje-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/70"
                    }`}
                  >
                    <td className="px-5 py-4 text-center font-black text-gray-400">
                      <Rank idx={idx} showMedals={anyScores} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-lg font-black text-gray-950">
                        {entry.display_name}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <ScoreCell value={scoresZichtbaar ? entry.pre_totaal : 0} muted={!scoresZichtbaar} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <ScoreCell value={wkScoresZichtbaar ? entry.wk_totaal : 0} muted={!wkScoresZichtbaar} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <ScoreCell
                        value={wkScoresZichtbaar ? formatDagscore(entry.dagscore) : 0}
                        muted={!wkScoresZichtbaar || entry.dagscore === 0}
                      />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <ScoreCell value={anyScores ? entry.totaal : 0} muted={!anyScores} highlight={anyScores} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
