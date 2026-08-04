"use client";

import type { BiCruzado } from "@/components/bi/bi-chart";

const fmt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

/** Tabla cruzada (pivote): filas = dimensión del eje X, columnas = segundo grupo. Misma forma que alimenta las barras agrupadas. */
export function BiTablaCruzada({ cruzado, ejeXLabel }: { cruzado: BiCruzado; ejeXLabel: string }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
        <thead>
          <tr style={{ color: "var(--sidebar-text)", textAlign: "left" }}>
            <th className="py-2 pr-3">{ejeXLabel}</th>
            {cruzado.series.map((s) => (
              <th key={s} className="py-2 pr-3 text-right">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cruzado.filas.map((f) => (
            <tr key={f.dimension} style={{ borderTop: "1px solid var(--field-border)", color: "var(--sidebar-text-active)" }}>
              <td className="py-2 pr-3">{f.dimension}</td>
              {cruzado.series.map((s) => (
                <td key={s} className="py-2 pr-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {fmt.format(f.valores[s] ?? 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
