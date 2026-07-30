"use client";

import { useRouter } from "next/navigation";

export function SelectorFechaChecklist({ fecha }: { fecha: string }) {
  const router = useRouter();

  return (
    <div className="flex items-end gap-3 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div>
        <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
          Fecha
        </label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => router.push(`/checklist/historial?fecha=${e.target.value}`)}
          className="rounded-md px-3"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)" }}
        />
      </div>
    </div>
  );
}
