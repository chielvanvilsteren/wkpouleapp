"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminDailySyncTest() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("loading");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch("/api/sync-results", { method: "POST", headers });
      const data = await res.json();
      setMsg(data.message ?? data.error ?? JSON.stringify(data));
    } catch {
      setMsg("Verbinding mislukt");
    }
    setStatus("done");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={status === "loading"}
        className="btn-secondary text-sm"
      >
        {status === "loading" ? "Bezig..." : "Test uitslagen-sync"}
      </button>
      {status === "done" && (
        <span className="text-xs text-gray-500">{msg}</span>
      )}
    </div>
  );
}
