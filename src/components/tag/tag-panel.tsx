"use client";

import { useState } from "react";
import { Ticket, DollarSign, Inbox } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/table";
import { fmtMoney } from "@/lib/formato";
import { TagForm } from "@/components/tag/tag-form";
import { TagAcordeon, type GrupoTag } from "@/components/tag/tag-acordeon";
import { TagPendienteRow } from "@/components/tag/tag-pendiente-row";

type Pendiente = {
  id: string;
  fecha: string;
  caseta: string | null;
  monto: string;
  proveedorTag: string;
  proyectoReportante: { nombre: string } | null;
};

export function TagPanel({
  unidades,
  proyectos,
  grupos,
  pendientes,
  totalTransacciones,
  gastoAcumulado,
}: {
  unidades: { numeroEconomico: string }[];
  proyectos: { id: string; nombre: string }[];
  grupos: GrupoTag[];
  pendientes: Pendiente[];
  totalTransacciones: number;
  gastoAcumulado: string | number | null;
}) {
  const [soloPendientes, setSoloPendientes] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Transacciones totales"
          value={totalTransacciones}
          icon={Ticket}
          accent="var(--color-primary)"
          onClick={() => setSoloPendientes(false)}
          seleccionado={!soloPendientes}
        />
        <StatCard
          label="Gasto acumulado"
          value={fmtMoney(gastoAcumulado)}
          icon={DollarSign}
          accent="var(--color-status-cerrado)"
          onClick={() => setSoloPendientes(false)}
          seleccionado={!soloPendientes}
        />
        <StatCard
          label="Pendientes de asignar"
          value={pendientes.length}
          icon={Inbox}
          accent="var(--color-status-revision)"
          onClick={() => setSoloPendientes((v) => !v)}
          seleccionado={soloPendientes}
        />
      </div>

      {!soloPendientes && <TagForm unidades={unidades} proyectos={proyectos} />}

      {(pendientes.length > 0 || soloPendientes) && (
        <div>
          <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--color-status-revision)" }}>
            Pendientes de asignar económico
          </h3>
          {pendientes.length === 0 ? (
            <EmptyState>No hay peajes pendientes de asignar.</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                    {["Fecha", "Caseta", "Monto", "Proveedor", "Proyecto", "Asignar a"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((p) => (
                    <TagPendienteRow key={p.id} tag={p} unidades={unidades} proyectos={proyectos} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!soloPendientes && (
        <div>
          <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Transacciones TAG por unidad
          </h3>
          {grupos.length === 0 ? (
            <EmptyState>Sin transacciones asignadas.</EmptyState>
          ) : (
            <TagAcordeon grupos={grupos} unidades={unidades} proyectos={proyectos} />
          )}
        </div>
      )}
    </>
  );
}
