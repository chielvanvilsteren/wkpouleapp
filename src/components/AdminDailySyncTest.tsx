"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDailySyncTest() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/sync-results?source=daily", { method: "POST" });
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
        {status === "loading" ? "Bezig..." : "🧪 Test dagelijkse controle"}
      </button>
      {status === "done" && (
        <span className="text-xs text-gray-500">{msg}</span>
      )}
    </div>
  );
}
