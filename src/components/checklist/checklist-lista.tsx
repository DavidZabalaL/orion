"use client";

import { useMemo, useState } from "react";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";

type ChecklistRow = {
  id: string;
  fecha: string;
  odometro: number;
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string };
  puntosInspeccion: Record<string, string>;
};

export function ChecklistLista({ checklists }: { checklists: ChecklistRow[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return checklists;
    return checklists.filter((c) => c.unidad.numeroEconomico.toUpperCase().includes(q));
  }, [checklists, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar número económico…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin checklists que coincidan.</EmptyState>
      ) : (
        <Table headers={["Hora", "Unidad", "Odómetro", "Puntos"]} minWidth={640}>
          {filtrados.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(c.fecha)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{c.unidad.numeroEconomico}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{c.odometro} km</td>
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
