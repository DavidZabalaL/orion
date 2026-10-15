"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { fmtMoney } from "@/lib/formato";
import { Modal } from "@/components/ui/modal";
import type { GastoUnidad } from "@/lib/gasto-unidad";

const COLOR_GRUPO: Record<string, string> = {
  combustible: "#2a78d6",
  casetas: "#eb6834",
  mantenimiento: "#1baf7a",
  tramites: "#eda100",
  siniestros: "#e34948",
  seguros: "#4a3aa7",
  otros: "#6b7785",
};

/**
 * Gasto total de la unidad como un campo discreto de la ficha (total del año
 * en curso) con un botón que abre el desglose por partida en una ventana
 * flotante. Ver src/lib/gasto-unidad.ts para las fuentes de cada partida.
 */
export function GastoUnidadCampo({ numeroEconomico, anio, historico }: { numeroEconomico: string; anio: GastoUnidad; historico: GastoUnidad }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span style={{ fontFamily: "var(--font-mono)" }}>{fmtMoney(anio.total)}</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>año en curso</span>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="flex items-center gap-1 rounded-md px-2 h-6"
          style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
        >
          <Eye size={12} /> Ver desglose
        </button>
      </span>
      {abierto && (
        <Modal title={`Gasto total — ${numeroEconomico}`} onClose={() => setAbierto(false)} maxWidth={620}>
          <GastoUnidadDesglose anio={anio} historico={historico} />
        </Modal>
      )}
    </>
  );
}

/** Desglose por partida (año en curso o histórico) — contenido de la ventana flotante. */
function GastoUnidadDesglose({ anio, historico }: { anio: GastoUnidad; historico: GastoUnidad }) {
  const [periodo, setPeriodo] = useState<"anio" | "historico">("anio");
  const g = periodo === "anio" ? anio : historico;
  const max = Math.max(...g.partidas.map((p) => p.monto), 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md p-0.5" style={{ background: "var(--chip)" }}>
            {(["anio", "historico"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                className="rounded px-3 h-7"
                style={{
                  background: periodo === p ? "var(--panel-bg)" : "transparent",
                  color: "var(--sidebar-text-active)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-xs)",
                  fontWeight: periodo === p ? 600 : 400,
                }}
              >
                {p === "anio" ? "Año en curso" : "Histórico"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
        {fmtMoney(g.total)}
      </div>

      {g.partidas.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Sin gastos registrados en este periodo.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {g.partidas.map((p) => (
            <div key={p.clave} className="flex items-center gap-3">
              <span className="w-44 shrink-0 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }} title={p.label}>
                {p.label}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--chip)" }}>
                <div style={{ width: `${Math.max(1, (p.monto / max) * 100)}%`, height: "100%", background: COLOR_GRUPO[p.grupo] ?? COLOR_GRUPO.otros, borderRadius: 999 }} />
              </div>
              <span className="w-32 shrink-0 text-right" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                {fmtMoney(p.monto)}
              </span>
              <span className="w-12 shrink-0 text-right" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                {g.total > 0 ? `${Math.round((p.monto / g.total) * 100)}%` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
        Combustible, casetas, gastos de mantenimiento y trámites (sin cancelados), siniestros (arrastre y reparación) y pólizas de seguro.
      </p>
    </div>
  );
}
