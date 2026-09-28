"use client";

import { Table, EmptyState } from "@/components/ui/table";

type Fila = {
  numeroEconomico: string;
  vehiculo: string;
  proyecto: string;
  motivo: string;
  motivoDetalle: string | null;
  fechaIngreso: string | null;
  costoReparacion: number;
};

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric", timeZone: "America/Mexico_City" });
}

function fmtMoney(v: number): string {
  return `$${v.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
}

export function UnidadesNoDisponiblesTabla({ filas }: { filas: Fila[] }) {
  if (filas.length === 0) {
    return <EmptyState>No hay unidades no disponibles en este momento.</EmptyState>;
  }

  return (
    <Table headers={["Económico", "Vehículo", "Proyecto", "Motivo", "Ingreso a taller", "Salida", "Costo de reparación"]} minWidth={860}>
      {filas.map((f) => (
        <tr key={f.numeroEconomico} style={{ borderBottom: "1px solid var(--field-border)" }}>
          <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{f.numeroEconomico}</td>
          <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{f.vehiculo}</td>
          <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{f.proyecto}</td>
          <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
            {f.motivo}
            {f.motivoDetalle && <span style={{ color: "var(--sidebar-text)" }}> — {f.motivoDetalle}</span>}
          </td>
          <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
            {f.fechaIngreso ? fmtFecha(f.fechaIngreso) : "—"}
          </td>
          <td className="px-4 py-3">
            <span
              className="rounded-full px-2.5 py-1"
              style={{ background: "rgba(217,119,6,0.12)", color: "#b45309", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
            >
              En taller
            </span>
          </td>
          <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            {fmtMoney(f.costoReparacion)}
          </td>
        </tr>
      ))}
    </Table>
  );
}
