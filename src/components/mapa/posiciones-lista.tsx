"use client";

import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";

export type PosicionRow = {
  numeroEconomico: string;
  descripcion: string;
  proyecto: string | null;
  timestamp: string | null;
  lat: number | null;
  lng: number | null;
  velocidad: number | null;
  esAnomalo: boolean | null;
  motivoAnomalia: string | null;
};

// Al hacer clic en una unidad del listado, centra el mapa en ella y despliega su
// panel lateral; el ícono de enlace externo abre su ficha en inventario.
export function PosicionesLista({
  posiciones,
  seleccionada,
  onSeleccionar,
}: {
  posiciones: PosicionRow[];
  seleccionada?: string | null;
  onSeleccionar?: (numeroEconomico: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {posiciones.length === 0 ? (
        <EmptyState>Sin unidades que coincidan.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                {["Unidad", "Descripción", "Proyecto", "Última actualización", "Velocidad", "Estatus GPS"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posiciones.map((u) => {
                const esActiva = seleccionada === u.numeroEconomico;
                return (
                  <tr
                    key={u.numeroEconomico}
                    onClick={() => onSeleccionar?.(u.numeroEconomico)}
                    className="transition-colors cursor-pointer hover:bg-[var(--chip)]"
                    style={{
                      borderBottom: "1px solid var(--field-border)",
                      background: esActiva ? "var(--chip)" : "transparent",
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeleccionar?.(u.numeroEconomico);
                          }}
                          className="flex items-center gap-1.5 hover:underline text-left"
                          style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)", cursor: "pointer" }}
                          title="Ubicar en mapa"
                        >
                          <MapPin size={14} className="text-[var(--color-primary)] shrink-0" />
                          {u.numeroEconomico}
                        </button>
                        <Link
                          href={`/unidades/${u.numeroEconomico}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Abrir ficha en inventario"
                          className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-[var(--chip)] transition-opacity"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.descripcion}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.proyecto ?? "—"}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.timestamp ? fmtFechaHora(u.timestamp) : "—"}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{u.velocidad != null ? `${u.velocidad} km/h` : "—"}</td>
                    <td className="px-4 py-3">
                      {u.timestamp === null ? (
                        <Badge label="Sin datos" color="var(--sidebar-text)" bg="var(--chip)" />
                      ) : u.esAnomalo ? (
                        <Badge label={u.motivoAnomalia ?? "Anómalo"} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
                      ) : (
                        <Badge label="Válido" color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
