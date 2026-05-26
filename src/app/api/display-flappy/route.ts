import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: allScores, error: scoresError } = await admin
    .from("flappy_scores")
    .select("user_id, score, fps")
    .eq("season", 2)
    .order("score", { ascending: false });

  if (scoresError) {
    return NextResponse.json({ error: scoresError.message }, { status: 500 });
  }

  const bestMap = new Map<string, { score: number; fps: number | null }>();
  for (const s of (allScores ?? []) as { user_id: string; score: number; fps: number | null }[]) {
    const prev = bestMap.get(s.user_id);
    if (!prev || s.score > prev.score) bestMap.set(s.user_id, { score: s.score, fps: s.fps ?? null });
  }

  if (bestMap.size === 0) return NextResponse.json([]);

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", Array.from(bestMap.keys()));

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const nameMap = new Map(
    ((profiles ?? []) as { id: string; display_name: string }[]).map((p) => [
      p.id,
      p.display_name,
    ]),
  );

  const result = Array.from(bestMap.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .map(([uid, { score, fps }]) => ({
      user_id: uid,
      display_name: nameMap.get(uid) ?? "Onbekend",
      best_score: score,
      best_fps: fps,
    }));

  return NextResponse.json(result);
}
