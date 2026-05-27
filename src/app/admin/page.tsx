import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types";
import AdminUitslagForm from "@/components/AdminUitslagForm";
import AdminToggles from "@/components/AdminToggles";
import AdminWkIncidentsForm from "@/components/AdminWkIncidentsForm";
import AdminMatchResults from "@/components/AdminMatchResults";
import AdminSyncLogs from "@/components/AdminSyncLogs";
import AdminTabsLayout from "@/components/AdminTabsLayout";
import AdminFlappyCredits from "@/components/AdminFlappyCredits";
import AdminDeelnemersToggle from "@/components/AdminDeelnemersToggle";
import AdminStickerbalSettings from "@/components/AdminStickerbalSettings";
import AdminRecalcWkScores from "@/components/AdminRecalcWkScores";
import AdminFootballHealth from "@/components/AdminFootballHealth";
import AdminDailySyncTest from "@/components/AdminDailySyncTest";
import AdminFlappySuspicious from "@/components/AdminFlappySuspicious";
import PageHeader from "@/components/PageHeader";
import type {
  MasterUitslag,
  Prediction,
  Profile,
  Match,
  WkIncidentsUitslag,
} from "@/types";
import type { SyncLog } from "@/components/AdminSyncLogs";

export const dynamic = "force-dynamic";

const DEFAULT_UITSLAG: MasterUitslag = {
  id: 1,
  selectie: [],
  basis_xi: [],
  inzendingen_open: true,
  inzendingen_deadline: null,
  scores_zichtbaar: false,
  wk_poule_open: true,
  wk_poule_deadline: null,
  wk_scores_zichtbaar: false,
  updated_at: new Date().toISOString(),
};

const DEFAULT_WK_UITSLAG: WkIncidentsUitslag = {
  id: 1,
  rode_kaart: "",
  gele_kaart: "",
  geblesseerde: "",
  eerste_goal_nl: "",
  topscorer_wk: "",
  wereldkampioen: "",
  finale_team1: "",
  finale_team2: "",
  updated_at: new Date().toISOString(),
};

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as Profile | null;
  if (!profile?.is_admin) redirect("/");

  const [
    { data: uitslagRaw },
    { data: predictionsRaw },
    { data: profilesRaw },
    { data: matchesRaw },
    { data: wkUitslagRaw },
    { data: syncLogsRaw },
  ] = await Promise.all([
    supabase.from("master_uitslag").select("*").eq("id", 1).single(),
    supabase.from("predictions").select("user_id, updated_at"),
    supabase.from("profiles").select("id, display_name, is_deelnemer"),
    supabase
      .from("matches")
      .select("*")
      .order("match_number", { ascending: true }),
    supabase.from("wk_incidents_uitslag").select("*").eq("id", 1).single(),
    supabase
      .from("sync_logs")
      .select("*")
      .order("ran_at", { ascending: false })
      .limit(50)
      .then((res) => ({ data: res.error ? [] : res.data })), // tabel bestaat mogelijk nog niet
  ]);

  const groupMatchIds = ((matchesRaw ?? []) as Match[])
    .filter((m) => m.stage === "group")
    .map((m) => m.id);

  const { data: groepPredictionsRaw } = groupMatchIds.length > 0
    ? await supabase
        .from("match_predictions")
        .select("user_id")
        .in("match_id", groupMatchIds)
        .or("home_score.gt.0,away_score.gt.0")
    : { data: [] };

  const uitslag = uitslagRaw as MasterUitslag | null;
  const predictions = (predictionsRaw ?? []) as Pick<
    Prediction,
    "user_id" | "updated_at"
  >[];
  const profiles = (profilesRaw ?? []) as (Pick<
    Profile,
    "id" | "display_name"
  > & { is_deelnemer: boolean })[];
  const matches = (matchesRaw ?? []) as Match[];
  const wkUitslag = wkUitslagRaw as WkIncidentsUitslag | null;
  const syncLogs = (syncLogsRaw ?? []) as SyncLog[];

  const effectiveUitslag: MasterUitslag = uitslag ?? DEFAULT_UITSLAG;
  const effectiveWkUitslag: WkIncidentsUitslag =
    wkUitslag ?? DEFAULT_WK_UITSLAG;

  const predictionMap = new Map(
    predictions.map((p) => [p.user_id, p.updated_at]),
  );

  const deelnemers = profiles
    .filter((p) => p.is_deelnemer !== false)
    .map((p) => ({
      ...p,
      heeftIngevuld: predictionMap.has(p.id),
      ingevuldOp: predictionMap.get(p.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.heeftIngevuld !== b.heeftIngevuld) return a.heeftIngevuld ? -1 : 1;
      return a.display_name.localeCompare(b.display_name, "nl");
    });

  const aantalIngevuld = deelnemers.filter((d) => d.heeftIngevuld).length;

  const groepIngevuldSet = new Set(
    ((groepPredictionsRaw ?? []) as { user_id: string }[]).map((r) => r.user_id),
  );
  const groepDeelnemers = profiles
    .filter((p) => p.is_deelnemer !== false)
    .map((p) => ({
      id: p.id,
      display_name: p.display_name,
      heeftIngevuld: groepIngevuldSet.has(p.id),
    }))
    .sort((a, b) => {
      if (a.heeftIngevuld !== b.heeftIngevuld) return a.heeftIngevuld ? -1 : 1;
      return a.display_name.localeCompare(b.display_name, "nl");
    });

  const errorLogs = syncLogs.filter((l) => l.status === "error").length;

  const { count: suspiciousCount } = await supabase
    .from("flappy_suspicious_attempts")
    .select("id", { count: "exact", head: true });

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        badge="Admin"
        subtitle={`Pre-pool: ${aantalIngevuld}/${deelnemers.length} · Groepsfase: ${groepDeelnemers.filter((d) => d.heeftIngevuld).length}/${groepDeelnemers.length} ingevuld`}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AdminTabsLayout
          tabs={[
            { key: "beheer", label: "Beheer" },
            { key: "credits", label: "🎮 Game instellingen", badge: suspiciousCount ?? 0 },
            { key: "berichten", label: "Berichten", badge: errorLogs },
          ]}
        >
          {/* Tab: Beheer */}
          <div className="grid gap-8">
            {/* Toggles */}
            <div className="card">
              <h2 className="section-title">Beheer</h2>
              <AdminToggles
                inzendingen_open={effectiveUitslag.inzendingen_open}
                inzendingen_deadline={effectiveUitslag.inzendingen_deadline}
                scores_zichtbaar={effectiveUitslag.scores_zichtbaar}
                wk_poule_open={effectiveUitslag.wk_poule_open}
                wk_poule_deadline={effectiveUitslag.wk_poule_deadline}
                wk_scores_zichtbaar={effectiveUitslag.wk_scores_zichtbaar}
              />
            </div>

            {/* Handmatig herberekenen */}
            <div className="card">
              <h2 className="section-title">WK Scores Herberekenen</h2>
              <p className="text-sm text-gray-600 mb-4">
                Herbereken alle WK-poule scores op basis van de huidige wedstrijduitslagen en voorspellingen. Gebruik dit als de ranglijst niet klopt.
              </p>
              <AdminRecalcWkScores />
            </div>

            {/* Deelnemers */}
            <div className="card">
              <h2 className="section-title">Deelnemers</h2>
              {deelnemers.length === 0 ? (
                <p className="text-gray-500 text-sm">Nog geen deelnemers.</p>
              ) : (
                <AdminDeelnemersToggle
                  preDeelnemers={deelnemers}
                  groepDeelnemers={groepDeelnemers}
                />
              )}
            </div>

            {/* Pre-pool uitslag */}
            <div className="card">
              <h2 className="section-title">Pre-pool Uitslag Invullen</h2>
              <p className="text-sm text-gray-600 mb-6">
                Officiële selectie + basis XI. Scores worden direct herberekend.
              </p>
              <AdminUitslagForm uitslag={effectiveUitslag} />
            </div>

            {/* WK incidents uitslag */}
            <div className="card">
              <h2 className="section-title">
                WK Poule — NL Incidenten & Topscorer
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Vul de werkelijke antwoorden in. WK scores worden direct
                herberekend.
              </p>
              <AdminWkIncidentsForm uitslag={effectiveWkUitslag} />
            </div>

            {/* Match results */}
            <div className="card">
              <h2 className="section-title">WK Poule — Wedstrijduitslagen</h2>
              <p className="text-sm text-gray-600 mb-6">
                Vul de uitslag in en markeer wedstrijden als afgerond. Klik
                daarna op opslaan.
              </p>
              <AdminMatchResults matches={matches} />
            </div>
          </div>

          {/* Tab: Game instellingen (Stickerbal + Flappy Credits) */}
          <div className="grid gap-6">
            <div className="card">
              <h2 className="section-title">⚽ Stickerbal — Spelsnelheid</h2>
              <AdminStickerbalSettings currentSpeed={Number((uitslag as (typeof uitslag & { stickerbal_speed?: number }) | null)?.stickerbal_speed) || 1.0} />
            </div>
            <div className="card">
              <h2 className="section-title">⚡ Flappy Bal Credits</h2>
              <p className="text-sm text-gray-600 mb-6">
                Overzicht van alle credits per deelnemer. Je kunt handmatig credits toekennen.
              </p>
              <AdminFlappyCredits />
            </div>
            <div className="card">
              <h2 className="section-title">
                🚨 Flappy Bal — Verdachte pogingen
                {(suspiciousCount ?? 0) > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {suspiciousCount}
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Scores die geblokkeerd zijn omdat de speeltijd niet klopte.
              </p>
              <AdminFlappySuspicious />
            </div>
          </div>

          {/* Tab: Berichten */}
          <div className="grid gap-8">
            <div className="card">
              <h2 className="section-title">Football-Data.org API</h2>
              <p className="text-sm text-gray-600 mb-4">
                Controleer of de externe API bereikbaar is en hoeveel quota er nog over is.
              </p>
              <AdminFootballHealth />
            </div>
            <div className="card">
              <h2 className="section-title">Synchronisatie berichten</h2>
              <p className="text-sm text-gray-600 mb-4">
                Overzicht van alle uitslag-syncs. De cronjob draait dagelijks om
                10:00 (CEST). Tijdens het WK elke 30 minuten.
              </p>
              <div className="mb-6">
                <AdminDailySyncTest />
              </div>
              <AdminSyncLogs logs={syncLogs} />
            </div>
          </div>
        </AdminTabsLayout>
      </div>
    </>
  );
}
