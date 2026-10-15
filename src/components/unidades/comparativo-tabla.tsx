"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download } from "lucide-react";
import { exportarExcel } from "@/lib/exportar-excel";
import { formatearValorBI } from "@/lib/bi/formato-valor";

export type FilaComparativo = {
  numeroEconomico: string;
  proyecto: string | null;
  modelo: string;
  kmRecorridos: number;
  litros: number;
  rendimientoReal: number | null;
  rendimientoFicha: number | null;
  combustible: number;
  mantenimiento: number;
  casetas: number;
  tramites: number;
  siniestros: number;
  seguros: number;
  otros: number;
  total: number;
  costoCombustibleKm: number | null;
};

type Columna = { id: keyof FilaComparativo; label: string; sufijo: string; /** "alto_malo": costo (más que el promedio es peor); "alto_bueno": rendimiento. */ sentido?: "alto_malo" | "alto_bueno" };

const COLUMNAS: Columna[] = [
  { id: "kmRecorridos", label: "Km recorridos", sufijo: " km" },
  { id: "litros", label: "Litros", sufijo: " L" },
  { id: "rendimientoReal", label: "Rend. real", sufijo: " km/L", sentido: "alto_bueno" },
  { id: "rendimientoFicha", label: "Rend. ficha técnica", sufijo: " km/L" },
  { id: "costoCombustibleKm", label: "Combustible $/km", sufijo: " MXN", sentido: "alto_malo" },
  { id: "combustible", label: "Combustible", sufijo: " MXN", sentido: "alto_malo" },
  { id: "mantenimiento", label: "Mantenimiento", sufijo: " MXN", sentido: "alto_malo" },
  { id: "casetas", label: "Casetas", sufijo: " MXN" },
  { id: "tramites", label: "Trámites", sufijo: " MXN" },
  { id: "siniestros", label: "Siniestros", sufijo: " MXN", sentido: "alto_malo" },
  { id: "seguros", label: "Seguros", sufijo: " MXN" },
  { id: "otros", label: "Otros", sufijo: " MXN" },
  { id: "total", label: "Total", sufijo: " MXN", sentido: "alto_malo" },
];

/** Umbral para resaltar una celda contra el promedio del grupo (±25%). */
const DESVIACION = 0.25;
const ROJO = "#dc2626";
const VERDE = "#16a34a";

function promedio(filas: FilaComparativo[], id: keyof FilaComparativo): number | null {
  const valores = filas.map((f) => f[id]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return valores.length ? valores.reduce((a, v) => a + v, 0) / valores.length : null;
}

export function ComparativoTabla({ filas, base, titulo }: { filas: FilaComparativo[]; base: string; titulo: string }) {
  const [orden, setOrden] = useState<{ id: keyof FilaComparativo; desc: boolean }>({ id: "total", desc: true });
  const promedios = useMemo(() => Object.fromEntries(COLUMNAS.map((c) => [c.id, promedio(filas, c.id)])) as Record<string, number | null>, [filas]);

  const ordenadas = useMemo(
    () =>
      [...filas].sort((a, b) => {
        const va = a[orden.id];
        const vb = b[orden.id];
        if (va === vb) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        return (va < vb ? -1 : 1) * (orden.desc ? -1 : 1);
      }),
    [filas, orden]
  );

  function color(c: Columna, v: unknown): string | undefined {
    const p = promedios[c.id];
    if (!c.sentido || typeof v !== "number" || p === null || p === 0 || filas.length < 2) return undefined;
    const alto = v > p * (1 + DESVIACION);
    const bajo = v < p * (1 - DESVIACION);
    if (c.sentido === "alto_malo") return alto ? ROJO : bajo ? VERDE : undefined;
    return alto ? VERDE : bajo ? ROJO : undefined;
  }

  function exportar() {
    exportarExcel(`comparativo-${base}`, [
      {
        nombre: "Comparativo",
        headers: ["Unidad", "Modelo", "Proyecto", ...COLUMNAS.map((c) => c.label)],
        filas: ordenadas.map((f) => [f.numeroEconomico, f.modelo, f.proyecto ?? "", ...COLUMNAS.map((c) => (f[c.id] as number | null) ?? "")]),
      },
    ]);
  }

  const th: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" };
  const td: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontVariantNumeric: "tabular-nums" };

  return (
    <div className="rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--field-border)" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          {titulo} · {filas.length} unidad{filas.length === 1 ? "" : "es"} · en <span style={{ color: ROJO, fontWeight: 600 }}>rojo</span> / <span style={{ color: VERDE, fontWeight: 600 }}>verde</span> lo que se aleja más de 25% del promedio del grupo
        </span>
        <button type="button" onClick={exportar} className="flex items-center gap-1.5 rounded-md px-3 h-8" style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          <Download size={14} /> Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
              <th className="sticky left-0 px-4 py-2 text-left" style={{ ...th, background: "var(--panel-bg)" }}>Unidad</th>
              {COLUMNAS.map((c) => (
                <th key={c.id} className="px-3 py-2 text-right whitespace-nowrap" style={th}>
                  <button type="button" onClick={() => setOrden((o) => ({ id: c.id, desc: o.id === c.id ? !o.desc : true }))} className="inline-flex items-center gap-1" style={{ ...th, cursor: "pointer" }}>
                    {c.label}
                    {orden.id === c.id && (orden.desc ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((f) => {
              const esBase = f.numeroEconomico === base;
              return (
                <tr key={f.numeroEconomico} style={{ borderBottom: "1px solid var(--field-border)", background: esBase ? "var(--status-asignado-bg)" : undefined }}>
                  <td className="sticky left-0 px-4 py-2.5" style={{ background: esBase ? "var(--status-asignado-bg)" : "var(--panel-bg)" }}>
                    <Link href={`/unidades/${f.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                      {f.numeroEconomico}
                    </Link>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                      {f.modelo}
                      {f.proyecto ? ` · ${f.proyecto}` : ""}
                      {esBase ? " · esta unidad" : ""}
                    </div>
                  </td>
                  {COLUMNAS.map((c) => {
                    const v = f[c.id] as number | null;
                    const col = color(c, v);
                    return (
                      <td key={c.id} className="px-3 py-2.5 text-right whitespace-nowrap" style={{ ...td, color: col ?? "var(--field-text)", fontWeight: col ? 700 : 400 }}>
                        {v === null ? "—" : formatearValorBI(v, c.sufijo)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr style={{ background: "var(--chip)" }}>
              <td className="sticky left-0 px-4 py-2.5" style={{ background: "var(--chip)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                Promedio del grupo
              </td>
              {COLUMNAS.map((c) => (
                <td key={c.id} className="px-3 py-2.5 text-right whitespace-nowrap" style={{ ...td, fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                  {promedios[c.id] === null ? "—" : formatearValorBI(promedios[c.id]!, c.sufijo)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
