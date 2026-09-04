"use client";

import { useState } from "react";
import Link from "next/link";
import { Fuel, Gauge, DollarSign, Inbox } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/table";
import { fmtMoney } from "@/lib/formato";
import { CombustibleForm } from "@/components/combustible/combustible-form";
import { CombustibleAcordeon, type GrupoCombustible } from "@/components/combustible/combustible-acordeon";
import { CombustiblePendienteRow } from "@/components/combustible/combustible-pendiente-row";

type Pendiente = {
  id: string;
  fecha: string;
  litros: string;
  costo: string;
  estacion: string | null;
  proyectoReportante: { nombre: string } | null;
};

type RendimientoPorUnidad = {
  numeroEconomico: string;
  _avg: { rendimientoCalculado: number | string | null };
};

export function CombustiblePanel({
  unidades,
  proyectos,
  grupos,
  pendientes,
  rendimientoPorUnidad,
  litrosAcumulados,
  gastoAcumulado,
  rendimientoPromedioFlota,
  isAdmin,
}: {
  unidades: { numeroEconomico: string }[];
  proyectos: { id: string; nombre: string }[];
  grupos: GrupoCombustible[];
  pendientes: Pendiente[];
  rendimientoPorUnidad: RendimientoPorUnidad[];
  litrosAcumulados: number;
  gastoAcumulado: string | number | null;
  rendimientoPromedioFlota: number;
  isAdmin: boolean;
}) {
  const [soloPendientes, setSoloPendientes] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Litros acumulados" value={`${litrosAcumulados.toLocaleString("es-MX")} L`} icon={Fuel} accent="var(--color-primary)" onClick={() => setSoloPendientes(false)} seleccionado={!soloPendientes} />
        <StatCard label="Gasto acumulado" value={fmtMoney(gastoAcumulado)} icon={DollarSign} accent="var(--color-status-cerrado)" onClick={() => setSoloPendientes(false)} seleccionado={!soloPendientes} />
        <StatCard label="Rendimiento promedio flota" value={`${rendimientoPromedioFlota.toFixed(1)} km/L`} icon={Gauge} accent="var(--color-status-revision)" onClick={() => setSoloPendientes(false)} seleccionado={!soloPendientes} />
        <StatCard label="Unidades con carga" value={rendimientoPorUnidad.length} icon={Fuel} accent="var(--color-status-asignado)" onClick={() => setSoloPendientes(false)} seleccionado={!soloPendientes} />
        <StatCard label="Pendientes de asignar" value={pendientes.length} icon={Inbox} accent="var(--color-status-revision)" onClick={() => setSoloPendientes((v) => !v)} seleccionado={soloPendientes} />
      </div>

      {!soloPendientes && <CombustibleForm unidades={unidades} proyectos={proyectos} />}

      {(pendientes.length > 0 || soloPendientes) && (
        <div>
          <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--color-status-revision)" }}>
            Pendientes de asignar económico
          </h3>
          {pendientes.length === 0 ? (
            <EmptyState>No hay cargas pendientes de asignar.</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                    {["Fecha", "Litros", "Costo", "Estación", "Proyecto", "Asignar a"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((p) => (
                    <CombustiblePendienteRow key={p.id} registro={p} unidades={unidades} proyectos={proyectos} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!soloPendientes && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Transacciones por unidad
            </h3>
            {grupos.length === 0 ? (
              <EmptyState>Sin transacciones registradas.</EmptyState>
            ) : (
              <CombustibleAcordeon grupos={grupos} isAdmin={isAdmin} />
            )}
          </div>

          <div>
            <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Rendimiento por unidad
            </h3>
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
              {rendimientoPorUnidad.length === 0 ? (
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Sin datos aún.</p>
              ) : (
                rendimientoPorUnidad.map((r) => (
                  <div key={r.numeroEconomico} className="flex items-center justify-between">
                    <Link href={`/unidades/${r.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                      {r.numeroEconomico}
                    </Link>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                      {r._avg.rendimientoCalculado ? `${Number(r._avg.rendimientoCalculado).toFixed(1)} km/L` : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
