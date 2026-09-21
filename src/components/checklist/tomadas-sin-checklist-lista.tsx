"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";

export type TomadaSinChecklistRow = {
  numeroEconomico: string;
  marca: string;
  unidadModelo: string;
  tipoVehiculo: string;
  proyectoNombre: string | null;
  responsable: string | null;
};

/** Unidades con una sesión de "Mi Turno" abierta (tomadas) que aún no tienen checklist diario capturado hoy. */
export function TomadasSinChecklistLista({ unidades }: { unidades: TomadaSinChecklistRow[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return unidades;
    return unidades.filter((u) => u.numeroEconomico.toUpperCase().includes(q));
  }, [unidades, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar número económico…" />
      {filtradas.length === 0 ? (
        <EmptyState>Sin unidades tomadas pendientes de checklist.</EmptyState>
      ) : (
        <Table headers={["Unidad", "Descripción", "Proyecto", "Tomada por"]} minWidth={620}>
          {filtradas.map((u) => (
            <tr key={u.numeroEconomico} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3">
                <Link href={`/unidades/${u.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                  {u.numeroEconomico}
                </Link>
              </td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.marca} {u.unidadModelo}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.proyectoNombre ?? "—"}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.responsable ?? "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
