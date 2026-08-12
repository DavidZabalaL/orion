"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";

type Movimiento = {
  id: string;
  timestamp: string;
  entidadId: string;
  accion: string;
  usuario: { nombre: string };
};

const ACCION_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  CREAR: { label: "Alta", color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  DAR_DE_BAJA: { label: "Baja", color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
  REACTIVAR: { label: "Reactivación", color: "var(--color-status-asignado)", bg: "var(--status-asignado-bg)" },
  EDITAR: { label: "Edición", color: "var(--sidebar-text)", bg: "var(--chip)" },
};

export function MovimientosLista({ movimientos }: { movimientos: Movimiento[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return movimientos;
    return movimientos.filter((m) =>
      m.entidadId.toUpperCase().includes(q) ||
      (ACCION_LABEL[m.accion]?.label ?? m.accion).toUpperCase().includes(q)
    );
  }, [movimientos, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar unidad o acción…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin movimientos que coincidan.</EmptyState>
      ) : (
        <Table headers={["Fecha", "Unidad", "Acción", "Usuario"]} minWidth={640}>
          {filtrados.map((m) => (
            <tr key={m.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(m.timestamp)}</td>
              <td className="px-4 py-3">
                <Link href={`/unidades/${m.entidadId}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                  {m.entidadId}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge label={ACCION_LABEL[m.accion]?.label ?? m.accion} color={ACCION_LABEL[m.accion]?.color ?? "var(--sidebar-text)"} bg={ACCION_LABEL[m.accion]?.bg ?? "var(--chip)"} />
              </td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{m.usuario.nombre}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
