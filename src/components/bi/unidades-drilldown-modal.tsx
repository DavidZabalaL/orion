"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { obtenerUnidadesPorCategoria, type UnidadDrillDown } from "@/app/(app)/dashboards/actions";

/**
 * Detalle de unidades detrás de una categoría clickeada (ej. "Mantenimiento"
 * en el widget de "No disponibilidad") — se pidió explícitamente poder ver
 * cuáles unidades son, no solo el conteo. Para el motivo "Otro" el conteo
 * agrupado no dice nada por sí solo (todas dicen "Otro"), así que cada
 * renglón muestra también su propio `motivoDetalle`.
 */
/**
 * Quien renderiza este modal debe pasar `key={`${campoId}:${valor}`}` (ver
 * bi-card.tsx) — así, si se hace clic en otra categoría mientras el modal ya
 * está abierto, React lo remonta en vez de reutilizar la instancia, y el
 * estado de carga vuelve a su valor inicial sin tener que resetearlo a mano
 * dentro del efecto.
 */
export function UnidadesDrillDownModal({
  titulo,
  campoId,
  valor,
  proyectoIds,
  onClose,
}: {
  titulo: string;
  campoId: "disponibilidad" | "motivoIndisponibilidad";
  valor: string;
  proyectoIds?: string[];
  onClose: () => void;
}) {
  const [estado, setEstado] = useState<{ cargando: boolean; unidades: UnidadDrillDown[]; error: string | null }>({
    cargando: true,
    unidades: [],
    error: null,
  });

  useEffect(() => {
    let cancelado = false;
    obtenerUnidadesPorCategoria({ campoId, valor, proyectoIds }).then((res) => {
      if (cancelado) return;
      setEstado(res.ok ? { cargando: false, unidades: res.unidades, error: null } : { cargando: false, unidades: [], error: res.error });
    });
    return () => {
      cancelado = true;
    };
  }, [campoId, valor, proyectoIds]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-xl"
        style={{ background: "var(--panel-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--field-border)" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              {titulo}
            </h2>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>{valor}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--sidebar-text)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {estado.cargando ? (
            <div className="flex items-center justify-center gap-2 p-8" style={{ color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
            </div>
          ) : estado.error ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-error)" }}>{estado.error}</p>
          ) : estado.unidades.length === 0 ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              No hay unidades en esta categoría.
            </p>
          ) : (
            <table className="w-full" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <th className="py-2 pr-3 text-left" style={{ color: "var(--sidebar-text)", fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase" }}>Económico</th>
                  <th className="py-2 pr-3 text-left" style={{ color: "var(--sidebar-text)", fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase" }}>Vehículo</th>
                  <th className="py-2 pr-3 text-left" style={{ color: "var(--sidebar-text)", fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase" }}>Proyecto</th>
                  {campoId === "motivoIndisponibilidad" && (
                    <th className="py-2 text-left" style={{ color: "var(--sidebar-text)", fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase" }}>Motivo</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {estado.unidades.map((u) => (
                  <tr key={u.numeroEconomico} style={{ borderBottom: "1px solid var(--field-border)" }}>
                    <td className="py-2 pr-3" style={{ color: "var(--sidebar-text-active)", fontWeight: 600 }}>{u.numeroEconomico}</td>
                    <td className="py-2 pr-3" style={{ color: "var(--sidebar-text-active)" }}>{u.vehiculo} · {u.tipoVehiculo}</td>
                    <td className="py-2 pr-3" style={{ color: "var(--sidebar-text-active)" }}>{u.proyecto}</td>
                    {campoId === "motivoIndisponibilidad" && (
                      <td className="py-2" style={{ color: "var(--sidebar-text-active)" }}>
                        {u.motivo}
                        {u.motivoDetalle ? ` — ${u.motivoDetalle}` : ""}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
