"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type RendimientoUnidad = {
  numeroEconomico: string;
  /** Rendimiento real: km/L ponderado por litros, solo con cargas válidas; null = sin datos suficientes. */
  rendimiento: number | null;
  /** Rendimiento teórico (ficha técnica de la unidad); null = no capturado. */
  teorico: number | null;
};

const ROJO = "#dc2626";
const VERDE = "#16a34a";

/** Diferencia del real contra el teórico, en % (negativo = rinde menos que su ficha); null sin alguno de los dos. */
function brecha(r: RendimientoUnidad): number | null {
  return r.rendimiento !== null && r.teorico !== null && r.teorico > 0 ? ((r.rendimiento - r.teorico) / r.teorico) * 100 : null;
}

const fmt = (v: number | null) => (v === null ? "—" : v.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

/**
 * Panel "Rendimiento por unidad" de /combustible: real vs. teórico (ficha
 * técnica) y una pestaña con el top 5 de peores rendimientos según esa
 * diferencia. El mismo indicador existe en el dashboard ("Diferencia
 * rendimiento real vs ficha (%)", dataset Unidades) para armar el widget.
 */
export function RendimientoPorUnidadPanel({ unidades }: { unidades: RendimientoUnidad[] }) {
  const [pestana, setPestana] = useState<"todas" | "peores">("todas");
  const peores = useMemo(
    () =>
      unidades
        .map((u) => ({ ...u, brecha: brecha(u) }))
        .filter((u): u is RendimientoUnidad & { brecha: number } => u.brecha !== null)
        .sort((a, b) => a.brecha - b.brecha)
        .slice(0, 5),
    [unidades]
  );
  const lista = pestana === "todas" ? unidades.map((u) => ({ ...u, brecha: brecha(u) })) : peores;

  const th: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" };
  const td: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontVariantNumeric: "tabular-nums" };

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex rounded-md p-0.5" style={{ background: "var(--chip)" }} role="tablist">
        {(
          [
            ["todas", "Todas"],
            ["peores", "Top 5 peores"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            onClick={() => setPestana(id)}
            className="flex-1 rounded px-3 h-7"
            style={{
              background: pestana === id ? "var(--panel-bg)" : "transparent",
              color: "var(--sidebar-text-active)",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-xs)",
              fontWeight: pestana === id ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {pestana === "peores" && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          Las 5 unidades que más rinden por debajo de su ficha técnica (real vs. teórico). Solo unidades con ambos datos.
        </p>
      )}

      {lista.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          {pestana === "todas" ? "Sin datos aún." : "No hay unidades con rendimiento real y de ficha técnica para comparar."}
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="pb-1.5 text-left" style={th}>Unidad</th>
              <th className="pb-1.5 text-right" style={th} title="Km recorridos ÷ litros de sus cargas válidas (cálculo de la plataforma)">Real</th>
              <th className="pb-1.5 text-right" style={th} title="Rendimiento de la ficha técnica de la unidad">Teórico</th>
              <th className="pb-1.5 text-right" style={th}>Dif.</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.numeroEconomico} style={{ borderTop: "1px solid var(--field-border)" }}>
                <td className="py-1.5">
                  <Link href={`/unidades/${r.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                    {r.numeroEconomico}
                  </Link>
                </td>
                <td className="py-1.5 text-right" style={{ ...td, color: "var(--sidebar-text-active)" }}>{fmt(r.rendimiento)}</td>
                <td className="py-1.5 text-right" style={{ ...td, color: "var(--sidebar-text)" }}>{fmt(r.teorico)}</td>
                <td
                  className="py-1.5 text-right"
                  style={{ ...td, fontWeight: r.brecha !== null ? 700 : 400, color: r.brecha === null ? "var(--sidebar-text)" : r.brecha < 0 ? ROJO : VERDE }}
                >
                  {r.brecha === null ? "—" : `${r.brecha > 0 ? "+" : ""}${Math.round(r.brecha)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
        km/L · Real: cálculo de la plataforma con las cargas. Teórico: ficha técnica de la unidad.
      </p>
    </div>
  );
}
