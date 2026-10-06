"use client";

import { colorParaValor, promedioDe, type ReglaColorColumna } from "@/lib/bi/reglas-color";

const fmt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

/** Tabla de la vista "Ver tabla" para cualquier gráfica simple (dimensión + valor) — barras, líneas, pie, puntos, divergente, etc. */
export function TablaSimple({
  datos,
  ejeXLabel,
  ejeYLabel,
  ejeYSufijo = "",
  mostrarTotal = false,
  reglasColor,
}: {
  datos: { dimension: string; valor: number }[];
  ejeXLabel: string;
  ejeYLabel: string;
  ejeYSufijo?: string;
  /** Agrega una fila "Total" en negritas con la suma de todos los valores mostrados. */
  mostrarTotal?: boolean;
  /** Semáforo condicional por valor — ver src/lib/bi/reglas-color.ts. La única "columna" de valor aquí se identifica como `ejeYLabel`. */
  reglasColor?: ReglaColorColumna[];
}) {
  const total = datos.reduce((acc, d) => acc + d.valor, 0);
  const promedio = promedioDe(datos.map((d) => d.valor));

  return (
    <table className="w-full" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
      <thead>
        <tr style={{ color: "var(--sidebar-text)", textAlign: "left" }}>
          <th className="py-2">{ejeXLabel}</th>
          <th className="py-2">{ejeYLabel}</th>
        </tr>
      </thead>
      <tbody>
        {mostrarTotal && (
          <tr style={{ borderBottom: "1px solid var(--field-border)", color: "var(--sidebar-text-active)", fontWeight: 700 }}>
            <td className="py-2">Total</td>
            <td className="py-2">{fmt.format(total)}{ejeYSufijo}</td>
          </tr>
        )}
        {datos.map((d) => {
          const color = colorParaValor(d.valor, ejeYLabel, reglasColor, promedio);
          return (
            <tr key={d.dimension} style={{ borderTop: "1px solid var(--field-border)", color: "var(--sidebar-text-active)" }}>
              <td className="py-2">{d.dimension}</td>
              <td className="py-2" style={color ? { color, fontWeight: 600 } : undefined}>{fmt.format(d.valor)}{ejeYSufijo}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
