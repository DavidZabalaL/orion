"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";

export type PosicionRow = {
  numeroEconomico: string;
  proyecto: string | null;
  timestamp: string | null;
  lat: number | null;
  lng: number | null;
  velocidad: number | null;
  esAnomalo: boolean | null;
  motivoAnomalia: string | null;
};

export function PosicionesLista({ posiciones }: { posiciones: PosicionRow[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return posiciones;
    return posiciones.filter((p) => p.numeroEconomico.toUpperCase().includes(q));
  }, [posiciones, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar número económico…" />
      {filtradas.length === 0 ? (
        <EmptyState>Sin unidades que coincidan.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                {["Unidad", "Proyecto", "Última actualización", "Lat", "Lng", "Velocidad", "Estatus GPS"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((u) => (
                <tr key={u.numeroEconomico} style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3">
                    <Link href={`/unidades/${u.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                      {u.numeroEconomico}
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.proyecto ?? "—"}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.timestamp ? fmtFechaHora(u.timestamp) : "—"}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{u.lat != null ? u.lat.toFixed(4) : "—"}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{u.lng != null ? u.lng.toFixed(4) : "—"}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
