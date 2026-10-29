"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, FileX, Receipt, Clock, FileQuestion } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Table, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora, fmtMoney } from "@/lib/formato";
import type { EstadoConciliacion } from "@/lib/conciliacion-combustible";

type Fila = {
  estado: EstadoConciliacion;
  numeroEconomico: string;
  fecha: string;
  checklist: { id: string; litros: number | null; importe: number | null } | null;
  transaccion: { litros: number; importe: number; estacion: string | null; fecha: string } | null;
};

const ESTADOS: { estado: EstadoConciliacion; label: string; icon: LucideIcon; color: string; bg: string }[] = [
  { estado: "CONCILIADA", label: "Conciliadas", icon: CheckCircle2, color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  { estado: "DIFERENCIA", label: "Con diferencia", icon: AlertTriangle, color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
  { estado: "SIN_CHECKLIST", label: "Carga sin checklist", icon: FileX, color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
  { estado: "SIN_TRANSACCION", label: "Checklist sin transacción", icon: Receipt, color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  { estado: "PENDIENTE", label: "Pendientes de importar", icon: Clock, color: "var(--sidebar-text)", bg: "var(--chip)" },
  { estado: "INCOMPLETO", label: "Checklist sin litros/importe", icon: FileQuestion, color: "var(--sidebar-text)", bg: "var(--chip)" },
];
const INFO = Object.fromEntries(ESTADOS.map((e) => [e.estado, e])) as Record<EstadoConciliacion, (typeof ESTADOS)[number]>;

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" };
const litrosTxt = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(2)} L`);
const dif = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null ? null : Math.round((a - b) * 100) / 100);

export function ConciliacionCombustibleTabla({ filas }: { filas: Fila[] }) {
  const [estado, setEstado] = useState<EstadoConciliacion | null>(null);
  const conteo = useMemo(() => {
    const m = new Map<EstadoConciliacion, number>();
    filas.forEach((f) => m.set(f.estado, (m.get(f.estado) ?? 0) + 1));
    return m;
  }, [filas]);
  const visibles = estado ? filas.filter((f) => f.estado === estado) : filas;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {ESTADOS.map((e) => (
          <StatCard
            key={e.estado}
            label={e.label}
            value={conteo.get(e.estado) ?? 0}
            icon={e.icon}
            accent={e.color}
            onClick={() => setEstado((actual) => (actual === e.estado ? null : e.estado))}
            seleccionado={estado === e.estado}
          />
        ))}
      </div>

      {visibles.length === 0 ? (
        <EmptyState>No hay cargas en este rango{estado ? " con ese estado" : ""}.</EmptyState>
      ) : (
        <Table headers={["Fecha", "Unidad", "Estado", "Checklist (litros · importe)", "Transacción (litros · importe)", "Diferencia", "Estación", ""]} minWidth={1000}>
          {visibles.map((f, i) => {
            const difLitros = dif(f.checklist?.litros, f.transaccion?.litros);
            const difImporte = dif(f.checklist?.importe, f.transaccion?.importe);
            return (
              <tr key={`${f.checklist?.id ?? ""}-${i}`} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3 whitespace-nowrap" style={td}>{fmtFechaHora(f.transaccion?.fecha ?? f.fecha)}</td>
                <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{f.numeroEconomico}</td>
                <td className="px-4 py-3"><Badge label={INFO[f.estado].label} color={INFO[f.estado].color} bg={INFO[f.estado].bg} /></td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ ...td, fontFamily: "var(--font-mono)" }}>
                  {f.checklist ? `${litrosTxt(f.checklist.litros)} · ${f.checklist.importe == null ? "—" : fmtMoney(f.checklist.importe)}` : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ ...td, fontFamily: "var(--font-mono)" }}>
                  {f.transaccion ? `${litrosTxt(f.transaccion.litros)} · ${fmtMoney(f.transaccion.importe)}` : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ ...td, fontFamily: "var(--font-mono)", color: f.estado === "DIFERENCIA" ? "var(--color-status-escena)" : td.color }}>
                  {f.estado === "DIFERENCIA"
                    ? [difLitros ? `${difLitros > 0 ? "+" : ""}${difLitros.toFixed(2)} L` : null, difImporte ? `${difImporte > 0 ? "+" : ""}${fmtMoney(difImporte)}` : null].filter(Boolean).join(" · ") || "Dato faltante"
                    : "—"}
                </td>
                <td className="px-4 py-3" style={td}>{f.transaccion?.estacion ?? "—"}</td>
                <td className="px-4 py-3">
                  {f.checklist && (
                    <Link href={`/checklist/${f.checklist.id}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-primary)" }}>
                      Ver checklist
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
        Diferencia = checklist − transacción. Una carga con diferencia o sin pareja puede ser un error de captura del operador, una carga no documentada o una transacción a revisar.
      </p>
    </div>
  );
}
