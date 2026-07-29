"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/formato";

export type ProyectoRow = {
  id: string;
  nombre: string;
  estadoRepublica: string;
  numUnidades: number;
  presupuestoAprobadoAnual: number;
  gastoAnual: number;
  pct: number;
  estatus: string;
};

export function ProyectosLista({ proyectos, anio }: { proyectos: ProyectoRow[]; anio: number }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return proyectos;
    return proyectos.filter((p) => p.nombre.toUpperCase().includes(q) || p.estadoRepublica.toUpperCase().includes(q));
  }, [proyectos, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar proyecto o estado…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin proyectos que coincidan.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                {["Proyecto", "Estado", "Unidades", `Presupuesto ${anio}`, "Gastado", "Estatus"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3">
                    <Link href={`/proyectos/${p.id}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{p.nombre}</Link>
                  </td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{p.estadoRepublica}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{p.numUnidades}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtMoney(p.presupuestoAprobadoAnual)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: p.pct > 90 ? "var(--color-status-escena)" : "var(--field-text)" }}>{fmtMoney(p.gastoAnual)} ({p.pct.toFixed(0)}%)</td>
                  <td className="px-4 py-3">
                    <Badge label={p.estatus === "ACTIVO" ? "Activo" : "Cerrado"} color={p.estatus === "ACTIVO" ? "var(--color-status-cerrado)" : "var(--sidebar-text)"} bg={p.estatus === "ACTIVO" ? "var(--status-cerrado-bg)" : "var(--chip)"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
