"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { AuditoriaRow } from "@/components/auditoria/auditoria-row";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";

type Auditoria = {
  id: string;
  fechaRevision: string;
  unidad: { numeroEconomico: string };
  categoriaGasto: string;
  montoPptto: string;
  montoReal: string;
  montoCv: string;
  diferencia: string;
  estatus: string;
  tipoDiscrepancia: string | null;
  resolucion: string | null;
};

export function AuditoriaLista({ auditorias }: { auditorias: Auditoria[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return auditorias;
    return auditorias.filter((a) =>
      a.unidad.numeroEconomico.toUpperCase().includes(q) ||
      (CATEGORIA_GASTO_LABEL[a.categoriaGasto] ?? a.categoriaGasto).toUpperCase().includes(q)
    );
  }, [auditorias, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar unidad o categoría…" />
      {filtradas.length === 0 ? (
        <EmptyState>Sin registros que coincidan.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                {["Fecha", "Unidad", "Categoría", "PTTO", "REAL", "CV", "Diferencia", "Estatus", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((a) => (
                <AuditoriaRow key={a.id} auditoria={a} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
