"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { CATEGORIA_GASTO_LABEL, ESTATUS_GASTO_LABEL, ESTATUS_GASTO_STYLE } from "@/lib/categorias-gasto";
import { MarcarRealizadoButton } from "@/components/mantenimiento/marcar-realizado-button";

export type GastoRow = {
  id: string;
  fecha: string;
  numeroEconomico: string | null;
  proyectoReportante: { nombre: string } | null;
  categoria: string;
  descripcion: string | null;
  costo: string;
  estatus: string;
};

function coincide(g: GastoRow, q: string) {
  return (
    (g.numeroEconomico ?? "").toUpperCase().includes(q) ||
    (g.proyectoReportante?.nombre ?? "").toUpperCase().includes(q) ||
    CATEGORIA_GASTO_LABEL[g.categoria]?.toUpperCase().includes(q)
  );
}

export function PendientesLista({ pendientes }: { pendientes: GastoRow[] }) {
  const [busqueda, setBusqueda] = useState("");
  const ahora = useMemo(() => new Date(), []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return pendientes;
    return pendientes.filter((g) => coincide(g, q));
  }, [pendientes, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar unidad o categoría…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin órdenes que coincidan.</EmptyState>
      ) : (
        <Table headers={["Fecha", "Unidad", "Categoría", "Descripción", "Costo", ""]} minWidth={760}>
          {filtrados.map((g) => (
            <tr key={g.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: new Date(g.fecha) < ahora ? "var(--color-status-escena)" : "var(--field-text)" }}>
                {fmtFecha(g.fecha)}
              </td>
              <td className="px-4 py-3">
                {g.numeroEconomico ? (
                  <Link href={`/unidades/${g.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                    {g.numeroEconomico}
                  </Link>
                ) : (
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>{g.proyectoReportante?.nombre ?? "—"}</span>
                )}
              </td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{CATEGORIA_GASTO_LABEL[g.categoria]}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{g.descripcion ?? "—"}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtMoney(g.costo)}</td>
              <td className="px-4 py-3"><MarcarRealizadoButton id={g.id} /></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

export function HistorialLista({ historial }: { historial: GastoRow[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return historial;
    return historial.filter((g) => coincide(g, q));
  }, [historial, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar unidad o categoría…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin gastos que coincidan.</EmptyState>
      ) : (
        <Table headers={["Fecha", "Unidad", "Categoría", "Costo", "Estatus"]} minWidth={640}>
          {filtrados.map((g) => (
            <tr key={g.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFecha(g.fecha)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{g.numeroEconomico ?? g.proyectoReportante?.nombre ?? "—"}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{CATEGORIA_GASTO_LABEL[g.categoria]}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtMoney(g.costo)}</td>
              <td className="px-4 py-3">
                <Badge label={ESTATUS_GASTO_LABEL[g.estatus]} color={ESTATUS_GASTO_STYLE[g.estatus]?.color} bg={ESTATUS_GASTO_STYLE[g.estatus]?.bg} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
