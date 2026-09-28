"use client";

import type { BiCruzado } from "@/components/bi/bi-chart";
import { colorParaValor, type ReglaColorColumna } from "@/lib/bi/reglas-color";

const fmt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

/** Tabla cruzada (pivote): filas = dimensión del eje X, columnas = segundo grupo. Misma forma que alimenta las barras agrupadas. */
export function BiTablaCruzada({
  cruzado,
  ejeXLabel,
  ejeYSufijo = "",
  mostrarTotal = false,
  reglasColor,
}: {
  cruzado: BiCruzado;
  ejeXLabel: string;
  ejeYSufijo?: string;
  /** Agrega una fila "Total" en negritas con la suma de cada columna/serie. */
  mostrarTotal?: boolean;
  /** Semáforo condicional por columna (cada serie de `cruzado.series` es una "columna") — ver src/lib/bi/reglas-color.ts. */
  reglasColor?: ReglaColorColumna[];
}) {
  const totalPorSerie = mostrarTotal
    ? Object.fromEntries(cruzado.series.map((s) => [s, cruzado.filas.reduce((acc, f) => acc + (f.valores[s] ?? 0), 0)]))
    : {};

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
          {mostrarTotal && (
            <tr style={{ borderBottom: "1px solid var(--field-border)", color: "var(--sidebar-text-active)", fontWeight: 700 }}>
              <td className="py-2 pr-3">Total</td>
              {cruzado.series.map((s) => (
                <td key={s} className="py-2 pr-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {fmt.format(totalPorSerie[s] ?? 0)}{ejeYSufijo}
                </td>
              ))}
            </tr>
          )}
          {cruzado.filas.map((f) => (
            <tr key={f.dimension} style={{ borderTop: "1px solid var(--field-border)", color: "var(--sidebar-text-active)" }}>
              <td className="py-2 pr-3">{f.dimension}</td>
              {cruzado.series.map((s) => {
                const valor = f.valores[s] ?? 0;
                const color = colorParaValor(valor, s, reglasColor);
                return (
                  <td key={s} className="py-2 pr-3 text-right" style={{ fontVariantNumeric: "tabular-nums", ...(color ? { color, fontWeight: 600 } : {}) }}>
                    {fmt.format(valor)}{ejeYSufijo}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
