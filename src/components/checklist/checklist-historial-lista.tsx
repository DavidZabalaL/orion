"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, ChevronRight, TriangleAlert, Printer } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";
import { exportarExcel, type HojaExcel } from "@/lib/exportar-excel";
import { TIPO_CHECKLIST_LABEL, COLUMNAS_POR_TIPO } from "@/lib/checklist-exportar";

export type TipoChecklistRow = "DIARIO" | "SEMANAL" | "CARGA_COMBUSTIBLE" | "REPORTE_FALLA";

const TIPO_LABEL = TIPO_CHECKLIST_LABEL;

const TIPO_COLOR: Record<TipoChecklistRow, { color: string; bg: string }> = {
  DIARIO: { color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  SEMANAL: { color: "var(--color-status-asignado)", bg: "var(--status-asignado-bg, var(--chip))" },
  CARGA_COMBUSTIBLE: { color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  REPORTE_FALLA: { color: "var(--color-status-escena)", bg: "var(--status-escena-bg, #fef2f2)" },
};

type ChecklistRow = {
  id: string;
  tipo: TipoChecklistRow;
  fecha: string;
  odometro: number | null;
  horometro: number | null;
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string };
  respuestasSemanal: Record<string, string>;
  puntosInspeccion: Record<string, string> | null;
  capturadoPor: { nombre: string } | null;
  alerta: boolean;
};

export function ChecklistHistorialLista({ checklists, desde, hasta }: { checklists: ChecklistRow[]; desde: string; hasta: string }) {
  const [busqueda, setBusqueda] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return checklists;
    return checklists.filter((c) => c.unidad.numeroEconomico.toUpperCase().includes(q));
  }, [checklists, busqueda]);

  function alternar(id: string) {
    setSeleccionados((s) => {
      const copia = new Set(s);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  function exportar() {
    const aExportar = seleccionados.size > 0 ? filtrados.filter((c) => seleccionados.has(c.id)) : filtrados;
    const encabezadoBase = ["Fecha", "Unidad", "Marca", "Modelo", "Capturado por", "Alerta"];

    const hojas: HojaExcel[] = (Object.keys(TIPO_LABEL) as TipoChecklistRow[])
      .map((tipo) => {
        const filasTipo = aExportar.filter((c) => c.tipo === tipo);
        if (filasTipo.length === 0) return null;

        const columnasExtra = COLUMNAS_POR_TIPO[tipo];
        const encabezadoExtra = tipo === "DIARIO" ? ["Odómetro", "Horómetro", ...columnasExtra.map((c) => c.label)] : columnasExtra.map((c) => c.label);

        const filas = filasTipo.map((c) => {
          const datos = tipo === "DIARIO" ? { ...(c.puntosInspeccion ?? {}), ...c.respuestasSemanal } : c.respuestasSemanal;
          const base = [fmtFechaHora(c.fecha), c.unidad.numeroEconomico, c.unidad.marca, c.unidad.unidadModelo, c.capturadoPor?.nombre ?? "—", c.alerta ? "Sí" : "No"];
          const extra = tipo === "DIARIO" ? [c.odometro ?? "", c.horometro ?? "", ...columnasExtra.map((col) => datos[col.key] ?? "")] : columnasExtra.map((col) => datos[col.key] ?? "");
          return [...base, ...extra];
        });

        return { nombre: TIPO_LABEL[tipo], headers: [...encabezadoBase, ...encabezadoExtra], filas };
      })
      .filter((h): h is HojaExcel => h !== null);

    if (hojas.length === 0) return;
    exportarExcel(`checklists-${desde}_${hasta}`, hojas);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar número económico…" />
        <button
          onClick={exportar}
          disabled={filtrados.length === 0}
          className="flex items-center gap-2 rounded-md px-4 h-10 disabled:opacity-50"
          style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", boxShadow: "var(--shadow-sm)" }}
        >
          <Download size={15} /> {seleccionados.size > 0 ? `Exportar seleccionados (${seleccionados.size})` : "Exportar todos a Excel"}
        </button>
      </div>
      {filtrados.length === 0 ? (
        <EmptyState>Sin checklists capturados en este rango.</EmptyState>
      ) : (
        <Table headers={["", "Tipo", "Fecha", "Unidad", "Capturado por", "Alerta", ""]} minWidth={780}>
          {filtrados.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3">
                <input type="checkbox" checked={seleccionados.has(c.id)} onChange={() => alternar(c.id)} />
              </td>
              <td className="px-4 py-3">
                <Badge label={TIPO_LABEL[c.tipo]} color={TIPO_COLOR[c.tipo].color} bg={TIPO_COLOR[c.tipo].bg} />
              </td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(c.fecha)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{c.unidad.numeroEconomico}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{c.capturadoPor?.nombre ?? "—"}</td>
              <td className="px-4 py-3">
                {c.alerta ? (
                  <span className="flex items-center gap-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)", fontWeight: 600 }}>
                    <TriangleAlert size={14} /> Sí
                  </span>
                ) : (
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/checklist/${c.id}`}
                    className="flex items-center gap-1 rounded-md px-2.5 py-1 w-fit"
                    style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
                  >
                    Ver ficha <ChevronRight size={13} />
                  </Link>
                  {c.tipo === "SEMANAL" && (
                    <Link
                      href={`/checklist/${c.id}?print=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Exportar este checklist a PDF"
                      className="flex items-center gap-1 rounded-md px-2.5 py-1 w-fit"
                      style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
                    >
                      <Printer size={13} /> PDF
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
