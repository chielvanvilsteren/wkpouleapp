"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminRecalcWkScores() {
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  const recalc = async () => {
    setStatus("busy");
    setMsg("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/wk-scores/recalculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus("ok");
      setMsg(body.message ?? "Scores herberekend.");
    } else {
      setStatus("error");
      setMsg(body.error ?? "Onbekende fout.");
    }
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <button
        onClick={recalc}
        disabled={status === "busy"}
        className="btn-primary disabled:opacity-50"
      >
        {status === "busy" ? "Berekenen..." : "⚽ Herbereken WK Scores Nu"}
      </button>
      {status === "ok" && (
        <span className="text-sm text-green-600 font-medium">✅ {msg}</span>
      )}
      {status === "error" && (
        <span className="text-sm text-red-600 font-medium">❌ {msg}</span>
      )}
    </div>
  );
}
