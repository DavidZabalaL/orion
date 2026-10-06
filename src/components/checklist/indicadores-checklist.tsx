"use client";

import { useMemo, useState } from "react";
import { TriangleAlert, Download } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import type { IndicadorChecklistUnidad } from "@/app/(app)/checklist/actions";
import { fmtFechaHora } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar-excel";

type FiltroIndicador = "aceiteBajo" | "aceiteMedio" | "sinGato" | "llantaCritica";

const FILTROS: { id: FiltroIndicador; label: string; coincide: (u: IndicadorChecklistUnidad) => boolean }[] = [
  { id: "aceiteBajo", label: "Aceite bajo", coincide: (u) => u.nivelAceite === "MINIMO" },
  { id: "aceiteMedio", label: "Aceite medio", coincide: (u) => u.nivelAceite === "MEDIO" },
  // "Gato" se captura como BUEN ESTADO / MAL ESTADO / NA — tanto mal estado
  // como no aplica (no cuenta con gato) son una unidad sin gato funcional.
  { id: "sinGato", label: "Sin gato (mal estado o N/A)", coincide: (u) => u.estadoGato === "MAL ESTADO" || u.estadoGato === "NA" },
  // Igual para llantas: un "N/A" en alguna llanta (ej. sin refacción) es
  // tan relevante como una llanta en 25%/0% — no debe quedar fuera del filtro.
  { id: "llantaCritica", label: "Llanta crítica (≤25% o N/A)", coincide: (u) => u.peorLlanta === "25%" || u.peorLlanta === "0% (REEMPLAZAR)" || u.algunaLlantaNA },
];

function peorLlantaTexto(u: IndicadorChecklistUnidad): string {
  if (u.peorLlanta) return u.peorLlanta;
  if (u.algunaLlantaNA) return "N/A";
  return "—";
}

/**
 * Filtros rápidos sobre el último checklist semanal de cada unidad — "qué
 * unidades tienen aceite bajo/medio, sin gato en buen estado, o con llanta
 * crítica", según lo que ya reporta el checklist. Un botón a la vez (no
 * combinados) para mantenerlo simple; el Explorador BI (dataset "Checklist
 * de unidades") permite combinaciones más finas si se necesitan.
 */
export function IndicadoresChecklist({ unidades }: { unidades: IndicadorChecklistUnidad[] }) {
  const [filtroActivo, setFiltroActivo] = useState<FiltroIndicador | null>(null);

  const conteos = useMemo(
    () => Object.fromEntries(FILTROS.map((f) => [f.id, unidades.filter(f.coincide).length])) as Record<FiltroIndicador, number>,
    [unidades]
  );

  const filtrados = useMemo(() => {
    if (!filtroActivo) return [];
    const filtro = FILTROS.find((f) => f.id === filtroActivo)!;
    return unidades.filter(filtro.coincide);
  }, [unidades, filtroActivo]);

  function exportar() {
    const aExportar = filtroActivo ? filtrados : unidades;
    const nombreFiltro = filtroActivo ? FILTROS.find((f) => f.id === filtroActivo)!.label : "Todas las unidades";
    const headers = ["Unidad", "Marca / Modelo", "Proyecto", "Nivel de aceite", "Gato", "Peor llanta", "Último checklist"];
    const filas = aExportar.map((u) => [
      u.numeroEconomico,
      u.marcaModelo,
      u.proyecto ?? "—",
      u.nivelAceite ?? "—",
      u.estadoGato ?? "—",
      peorLlantaTexto(u),
      fmtFechaHora(u.fecha),
    ]);
    exportarExcel("indicadores-checklist", [{ nombre: nombreFiltro.slice(0, 31), headers, filas }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltroActivo((actual) => (actual === f.id ? null : f.id))}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-semibold transition-colors"
            style={{
              background: filtroActivo === f.id ? "var(--color-primary)" : "var(--chip)",
              color: filtroActivo === f.id ? "#fff" : "var(--sidebar-text-active)",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
            }}
          >
            {conteos[f.id] > 0 && <TriangleAlert size={13} />}
            {f.label} ({conteos[f.id]})
          </button>
        ))}
        <button
          type="button"
          onClick={exportar}
          disabled={unidades.length === 0}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold disabled:opacity-50"
          style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", boxShadow: "var(--shadow-sm)" }}
        >
          <Download size={13} /> Exportar a Excel
        </button>
      </div>

      {filtroActivo && (
        filtrados.length === 0 ? (
          <EmptyState>Ninguna unidad coincide con este filtro.</EmptyState>
        ) : (
          <Table headers={["Unidad", "Proyecto", "Nivel de aceite", "Gato", "Peor llanta", "Último checklist"]} minWidth={760}>
            {filtrados.map((u) => (
              <tr key={u.numeroEconomico} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                  {u.numeroEconomico} <span style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>· {u.marcaModelo}</span>
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.proyecto ?? "—"}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.nivelAceite ?? "—"}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.estadoGato ?? "—"}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{peorLlantaTexto(u)}</td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>{fmtFechaHora(u.fecha)}</td>
              </tr>
            ))}
          </Table>
        )
      )}
    </div>
  );
}
