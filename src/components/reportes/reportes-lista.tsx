"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { ReporteRow, type Reporte } from "@/components/reportes/reporte-row";

export function ReportesLista({ reportes }: { reportes: Reporte[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return reportes;
    return reportes.filter((r) => r.nombre.toUpperCase().includes(q));
  }, [reportes, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar reporte por nombre…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin reportes que coincidan.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((r) => (
            <ReporteRow key={r.id} reporte={r} />
          ))}
        </div>
      )}
    </div>
  );
}
