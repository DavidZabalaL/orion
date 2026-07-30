"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";
import { exportarCsv } from "@/lib/exportar-csv";

type ChecklistRow = {
  id: string;
  fecha: string;
  odometro: number;
  horometro: number | null;
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string };
  puntosInspeccion: Record<string, string>;
};

export function ChecklistHistorialLista({ checklists, fecha }: { checklists: ChecklistRow[]; fecha: string }) {
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
    const headers = ["Fecha", "Unidad", "Marca", "Modelo", "Odómetro", "Horómetro", ...Object.keys(aExportar[0]?.puntosInspeccion ?? {})];
    const filas = aExportar.map((c) => [
      fmtFechaHora(c.fecha),
      c.unidad.numeroEconomico,
      c.unidad.marca,
      c.unidad.unidadModelo,
      c.odometro,
      c.horometro ?? "",
      ...Object.values(c.puntosInspeccion),
    ]);
    exportarCsv(`checklists-${fecha}`, headers, filas);
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
          <Download size={15} /> {seleccionados.size > 0 ? `Exportar seleccionados (${seleccionados.size})` : "Exportar todos"}
        </button>
      </div>
      {filtrados.length === 0 ? (
        <EmptyState>Sin checklists capturados en esta fecha.</EmptyState>
      ) : (
        <Table headers={["", "Hora", "Unidad", "Odómetro", "Horómetro", "Puntos"]} minWidth={720}>
          {filtrados.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3">
                <input type="checkbox" checked={seleccionados.has(c.id)} onChange={() => alternar(c.id)} />
              </td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(c.fecha)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{c.unidad.numeroEconomico}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{c.odometro} km</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{c.horometro !== null ? `${c.horometro} h` : "—"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(c.puntosInspeccion).map(([k, v]) => (
                    <Badge key={k} label={k} color={v === "ok" ? "var(--color-status-cerrado)" : "var(--color-status-revision)"} bg={v === "ok" ? "var(--status-cerrado-bg)" : "var(--status-revision-bg)"} />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
