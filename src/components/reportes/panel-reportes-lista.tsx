"use client";

import { useState, useTransition } from "react";
import { Plus, Play, Trash2 } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";
import { CrearReporteBiModal } from "@/components/reportes/crear-reporte-bi-modal";
import { alternarActivoReporte, eliminarReporteProgramado, ejecutarReporteAhora, type ReporteProgramadoRow } from "@/app/(app)/reportes/programados/actions";
import type { ProyectoDisponible } from "@/components/bi/selectores-combinacion";

const FRECUENCIA_LABEL = { DIARIO: "Diario", SEMANAL: "Semanal", MENSUAL: "Mensual" };

export function PanelReportesLista({ reportes, proyectosDisponibles }: { reportes: ReporteProgramadoRow[]; proyectosDisponibles: ProyectoDisponible[] }) {
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [pending, startTransition] = useTransition();
  const [idsEjecutando, setIdsEjecutando] = useState<Set<string>>(new Set());

  function alternar(id: string, activo: boolean) {
    startTransition(async () => {
      await alternarActivoReporte(id, activo);
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar este reporte programado? No se puede deshacer.")) return;
    startTransition(async () => {
      await eliminarReporteProgramado(id);
    });
  }

  function ejecutarAhora(id: string) {
    setIdsEjecutando((s) => new Set(s).add(id));
    startTransition(async () => {
      await ejecutarReporteAhora(id);
      setIdsEjecutando((s) => {
        const copia = new Set(s);
        copia.delete(id);
        return copia;
      });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setMostrarCrear(true)}
        className="flex items-center gap-2 rounded-md px-4 h-10 w-fit"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600 }}
      >
        <Plus size={16} /> Nuevo reporte
      </button>

      {reportes.length === 0 ? (
        <EmptyState>Sin reportes programados todavía.</EmptyState>
      ) : (
        <Table headers={["Nombre", "Frecuencia", "Destinatarios", "Última ejecución", "Activo", ""]} minWidth={860}>
          {reportes.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                {r.nombre}
                <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{r.creadoPorNombre} · {r.formato}</div>
              </td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                {FRECUENCIA_LABEL[r.frecuencia]} · {r.hora}
              </td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                {r.destinatarios.join(", ")}
              </td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                {r.ultimaEjecucionEn ? (
                  <>
                    {fmtFechaHora(r.ultimaEjecucionEn)}{" "}
                    <Badge
                      label={r.ultimoEstatus === "ok" ? "OK" : r.ultimoEstatus === "sin_destinatarios" ? "Sin destinatarios" : "Error"}
                      color={r.ultimoEstatus === "ok" ? "var(--color-status-cerrado)" : "var(--color-status-escena)"}
                      bg={r.ultimoEstatus === "ok" ? "var(--status-cerrado-bg)" : "var(--status-escena-bg)"}
                    />
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <label className="flex items-center gap-2" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={r.activo} disabled={pending} onChange={(e) => alternar(r.id, e.target.checked)} />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>{r.activo ? "Activo" : "Inactivo"}</span>
                </label>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => ejecutarAhora(r.id)}
                    disabled={idsEjecutando.has(r.id)}
                    title="Ejecutar ahora"
                    className="flex h-7 w-7 items-center justify-center rounded-md disabled:opacity-50"
                    style={{ background: "var(--chip)", color: "var(--sidebar-text-active)" }}
                  >
                    <Play size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(r.id)}
                    title="Eliminar"
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {mostrarCrear && (
        <CrearReporteBiModal
          proyectosDisponibles={proyectosDisponibles}
          onCerrar={() => setMostrarCrear(false)}
          onGuardado={() => {
            setMostrarCrear(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
