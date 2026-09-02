"use client";

import { useState, useTransition } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { liberarUnidadAjena } from "@/app/(app)/operador/turno/actions";

export function BotonLiberarUnidadAjena({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await liberarUnidadAjena(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al liberar la unidad.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-1 rounded-md px-2.5 py-1 disabled:opacity-50"
        style={{ background: "var(--status-baja-bg, #fee2e2)", color: "var(--color-status-baja, #dc2626)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
      >
        {pending ? <RefreshCw size={12} className="animate-spin" /> : <LogOut size={12} />} Liberar
      </button>
      {error && (
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-baja, #dc2626)" }}>{error}</span>
      )}
    </div>
  );
}
