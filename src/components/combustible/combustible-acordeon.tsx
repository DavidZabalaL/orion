"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { CombustibleRow } from "@/components/combustible/combustible-row";

export type CombustibleTransaccion = {
  id: string;
  fecha: string;
  litros: string;
  costo: string;
  kmActual: number;
  estacion: string | null;
  rendimientoCalculado: string | null;
  alertaSobrellenado: boolean;
};

export type GrupoCombustible = {
  numeroEconomico: string;
  totalLitros: number;
  totalCosto: number;
  rendimientoPromedio: number | null;
  ultimaFecha: string;
  alertasPendientes: number;
  transacciones: CombustibleTransaccion[];
};

export function CombustibleAcordeon({ grupos }: { grupos: GrupoCombustible[] }) {
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return grupos;
    return grupos.filter((g) => g.numeroEconomico.toUpperCase().includes(q));
  }, [grupos, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar número económico…" />

      <div className="flex flex-col gap-2">
        {filtrados.map((g) => {
          const abierto = abiertoId === g.numeroEconomico;
          return (
            <div key={g.numeroEconomico} className="rounded-xl overflow-hidden" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
              <button
                onClick={() => setAbiertoId(abierto ? null : g.numeroEconomico)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                {abierto ? <ChevronDown size={16} color="var(--sidebar-text)" className="shrink-0" /> : <ChevronRight size={16} color="var(--sidebar-text)" className="shrink-0" />}

                <Link
                  href={`/unidades/${g.numeroEconomico}`}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--sidebar-text-active)" }}
                >
                  {g.numeroEconomico}
                </Link>

                <div className="flex flex-1 flex-wrap items-center justify-end gap-4 md:gap-6">
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                    {g.transacciones.length} carga{g.transacciones.length === 1 ? "" : "s"}
                  </span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                    Último: {fmtFecha(g.ultimaFecha)}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                    {g.totalLitros.toFixed(1)} L
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                    {fmtMoney(g.totalCosto)}
                  </span>
                  {g.alertasPendientes > 0 ? (
                    <Badge label={`${g.alertasPendientes} sobrellenado`} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
                  ) : (
                    <Badge label={g.rendimientoPromedio ? `${g.rendimientoPromedio.toFixed(1)} km/L` : "Sin rendimiento"} color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
                  )}
                </div>
              </button>

              {abierto && (
                <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--field-border)" }}>
                  <table className="w-full min-w-[700px] border-collapse">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                        {["Fecha", "Litros", "Costo", "Km", "Estación", "Rendimiento", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {g.transacciones.map((t) => (
                        <CombustibleRow key={t.id} registro={t} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
