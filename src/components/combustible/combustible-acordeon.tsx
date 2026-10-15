"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BadgeMotivo } from "@/components/ui/badge-motivo";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { CombustibleRow } from "@/components/combustible/combustible-row";

export type CombustibleTransaccion = {
  id: string;
  fecha: string;
  litros: string;
  costo: string;
  kmActual: number | null;
  estacion: string | null;
  rendimientoCalculado: string | null;
  alertaSobrellenado: boolean;
  kmRecorridos: number | null;
  fuenteKmRecorridos: "GPS" | "CAPTURA" | null;
  kmGps: number | null;
  kmCapturaRecorridos: number | null;
  motivoSobrellenado: string | null;
  discrepanciaGps: string | null;
  /** false antes del 1-oct-2026: esas cargas se calculan solo con km capturado (ver INICIO_KM_GPS). */
  gpsAplica: boolean;
};

export type GrupoCombustible = {
  numeroEconomico: string;
  totalLitros: number;
  totalCosto: number;
  rendimientoPromedio: number | null;
  ultimaFecha: string;
  alertasPendientes: number;
  /** Cargas cuyo km recorrido capturado no coincide con el del GPS. */
  discrepanciasGps: number;
  transacciones: CombustibleTransaccion[];
};

/** Texto breve del hover del encabezado: cuántas cargas y de qué fechas; el detalle de cada una está en su fila. */
function resumenAlertas(g: GrupoCombustible, filtro: (t: CombustibleTransaccion) => boolean, que: string): string {
  const fechas = g.transacciones.filter(filtro).map((t) => fmtFecha(t.fecha));
  const lista = fechas.length > 4 ? `${fechas.slice(0, 4).join(", ")} y ${fechas.length - 4} más` : fechas.join(", ");
  return `${fechas.length} carga${fechas.length === 1 ? "" : "s"} ${que}: ${lista}. Abre la unidad para ver la razón de cada una.`;
}

export function CombustibleAcordeon({ grupos, isAdmin = false }: { grupos: GrupoCombustible[]; isAdmin?: boolean }) {
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
                  {g.discrepanciasGps > 0 && (
                    <BadgeMotivo
                      label={`${g.discrepanciasGps} km ≠ GPS`}
                      motivo={resumenAlertas(g, (t) => !!t.discrepanciaGps, "con km capturado que no coincide con el GPS")}
                      color="var(--color-status-revision)"
                      bg="var(--status-revision-bg)"
                    />
                  )}
                  {g.alertasPendientes > 0 ? (
                    <BadgeMotivo
                      label={`${g.alertasPendientes} sobrellenado`}
                      motivo={resumenAlertas(g, (t) => t.alertaSobrellenado, "que exceden la capacidad estimada del tanque")}
                      color="var(--color-status-escena)"
                      bg="var(--status-escena-bg)"
                    />
                  ) : (
                    <Badge label={g.rendimientoPromedio ? `${g.rendimientoPromedio.toFixed(1)} km/L` : "Sin rendimiento"} color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
                  )}
                </div>
              </button>

              {abierto && (
                <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--field-border)" }}>
                  <table className="w-full min-w-[820px] border-collapse">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                        {["Fecha", "Litros", "Costo", "Km capturado", "Km GPS", "Km recorridos", "Estación", "Rendimiento real", "Alertas"].map((h) => (
                          <th key={h} className="text-left px-4 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {g.transacciones.map((t) => (
                        <CombustibleRow key={t.id} registro={t} isAdmin={isAdmin} />
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
