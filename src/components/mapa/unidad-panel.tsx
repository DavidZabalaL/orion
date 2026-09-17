"use client";

import Link from "next/link";
import { X, Fuel, Route, Radio } from "lucide-react";
import { GaugeCircular } from "@/components/mapa/gauge-circular";
import { MovimientoChart } from "@/components/mapa/movimiento-chart";
import { fmtFechaHora } from "@/lib/formato";

export type DetalleUnidad = {
  numeroEconomico: string;
  marca: string;
  modelo: string;
  anio: number;
  placas: string;
  tipoVehiculo: string;
  proyecto: string | null;
  conductor: string | null;
  ultima: { lat: number; lng: number; timestamp: string; velocidad: number | null; esAnomalo: boolean; motivoAnomalia: string | null } | null;
  combustible: { porcentaje: number; litros: number; capacidad: number } | null;
  kmHoy: number;
  ruta: { lat: number; lng: number; timestamp: string; velocidad: number | null }[];
};

const filaStyle: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" };
const valorStyle: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" };

export function UnidadPanel({ detalle, cargando, onCerrar }: { detalle: DetalleUnidad | null; cargando: boolean; onCerrar: () => void }) {
  return (
    <div
      className="w-full md:w-[340px] md:absolute md:top-4 md:right-4 md:z-[1000] flex flex-col gap-4 rounded-xl p-5 mt-4 md:mt-0 max-h-[80vh] overflow-y-auto"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-md, var(--shadow-sm))" }}
    >
      {cargando || !detalle ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Cargando unidad…</div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link href={`/unidades/${detalle.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                {detalle.numeroEconomico}
              </Link>
              <div style={filaStyle}>
                {detalle.marca} {detalle.modelo} {detalle.anio} · {detalle.tipoVehiculo}
              </div>
            </div>
            <button onClick={onCerrar} aria-label="Cerrar" style={{ color: "var(--sidebar-text)" }}>
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg p-3" style={{ background: "var(--chip)" }}>
            <div className="flex justify-between"><span style={filaStyle}>Placas</span><span style={valorStyle}>{detalle.placas}</span></div>
            <div className="flex justify-between"><span style={filaStyle}>Proyecto</span><span style={valorStyle}>{detalle.proyecto ?? "—"}</span></div>
            <div className="flex justify-between"><span style={filaStyle}>Conductor asignado</span><span style={valorStyle}>{detalle.conductor ?? "Sin asignar"}</span></div>
          </div>

          {detalle.ultima && (
            <div className="flex items-center gap-2" style={filaStyle}>
              <Radio size={14} />
              Última actualización: <span style={valorStyle}>{fmtFechaHora(detalle.ultima.timestamp)}</span>
              {detalle.ultima.velocidad != null && <span style={valorStyle}>· {detalle.ultima.velocidad.toFixed(0)} km/h</span>}
            </div>
          )}
          {detalle.ultima?.esAnomalo && (
            <div style={{ ...filaStyle, color: "var(--color-status-escena)", fontWeight: 600 }}>
              ⚠ {detalle.ultima.motivoAnomalia ?? "Lectura anómala"}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center rounded-lg p-3" style={{ background: "var(--chip)" }}>
              {detalle.combustible ? (
                <GaugeCircular
                  porcentaje={detalle.combustible.porcentaje}
                  color="var(--color-status-cerrado)"
                  valor={`${detalle.combustible.litros} L`}
                  etiqueta="Combustible (est.)"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-3">
                  <Fuel size={24} color="var(--sidebar-text)" />
                  <span style={{ ...filaStyle, textAlign: "center" }}>Sin dato de combustible</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center justify-center gap-1 rounded-lg p-3" style={{ background: "var(--chip)" }}>
              <Route size={22} color="var(--color-primary)" />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                {detalle.kmHoy.toLocaleString("es-MX")} km
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>Recorridos hoy</div>
            </div>
          </div>

          <div>
            <div className="mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Movimiento de hoy
            </div>
            <MovimientoChart puntos={detalle.ruta} />
          </div>
        </>
      )}
    </div>
  );
}
