"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Satellite, Radio } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PosicionesLista, type PosicionRow } from "@/components/mapa/posiciones-lista";
import { UnidadPanel, type DetalleUnidad } from "@/components/mapa/unidad-panel";
import type { PuntoMapa, PuntoRuta } from "@/components/mapa/flota-map";

// Leaflet toca `window` al importarse — debe cargar solo en cliente.
const FlotaMap = dynamic(() => import("@/components/mapa/flota-map").then((m) => m.FlotaMap), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{ height: 520, background: "var(--panel-bg)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)" }}
    >
      Cargando mapa…
    </div>
  ),
});

export type UnidadMapaRow = PosicionRow & { tipoVehiculo: string; disponibilidad: boolean };

type EstatusGps = "conSenal" | "sinSenal" | "anomalo";

export function MapaFlota({ unidades, tipos }: { unidades: UnidadMapaRow[]; tipos: string[] }) {
  const [proyectosSeleccionados, setProyectosSeleccionados] = useState<string[]>([]);
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([]);
  const [estatusGps, setEstatusGps] = useState<EstatusGps | null>(null);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleUnidad | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargarDetalle = useCallback(async (numeroEconomico: string, dias = 1) => {
    setSeleccionada(numeroEconomico);
    setCargandoDetalle(true);
    if (dias <= 1) setDetalle(null);
    try {
      const res = await fetch(`/api/mapa/detalle/${encodeURIComponent(numeroEconomico)}?dias=${dias}`);
      if (res.ok) setDetalle(await res.json());
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  const ruta: PuntoRuta[] = useMemo(() => detalle?.ruta.map((p) => ({ lat: p.lat, lng: p.lng })) ?? [], [detalle]);

  const proyectos = useMemo(() => {
    const set = new Set(unidades.map((u) => u.proyecto ?? "Sin proyecto"));
    return Array.from(set).sort();
  }, [unidades]);

  function alternar(lista: string[], setLista: (v: string[]) => void, valor: string) {
    setLista(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);
  }

  const filtradas = useMemo(() => {
    return unidades.filter((u) => {
      if (proyectosSeleccionados.length && !proyectosSeleccionados.includes(u.proyecto ?? "Sin proyecto")) return false;
      if (tiposSeleccionados.length && !tiposSeleccionados.includes(u.tipoVehiculo)) return false;
      if (estatusGps === "sinSenal" && u.timestamp !== null) return false;
      if (estatusGps === "conSenal" && (u.timestamp === null || u.esAnomalo)) return false;
      if (estatusGps === "anomalo" && !u.esAnomalo) return false;
      return true;
    });
  }, [unidades, proyectosSeleccionados, tiposSeleccionados, estatusGps]);

  const conSenal = filtradas.filter((u) => u.timestamp !== null);
  const sinSenal = filtradas.filter((u) => u.timestamp === null);
  const conAnomalia = conSenal.filter((u) => u.esAnomalo);

  const puntosMapa: PuntoMapa[] = conSenal
    .filter((u) => u.lat != null && u.lng != null)
    .map((u) => ({
      numeroEconomico: u.numeroEconomico,
      proyecto: u.proyecto,
      tipoVehiculo: u.tipoVehiculo,
      disponibilidad: u.disponibilidad,
      lat: u.lat as number,
      lng: u.lng as number,
      timestamp: u.timestamp as string,
      velocidad: u.velocidad,
      esAnomalo: u.esAnomalo ?? false,
      motivoAnomalia: u.motivoAnomalia,
    }));

  const hayFiltros = proyectosSeleccionados.length > 0 || tiposSeleccionados.length > 0 || estatusGps !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Unidades activas" value={filtradas.length} icon={MapPin} accent="var(--color-primary)" compacto />
        <StatCard
          label="Con señal reciente"
          value={conSenal.length - conAnomalia.length}
          icon={Radio}
          accent="var(--color-status-cerrado)"
          onClick={() => setEstatusGps((v) => (v === "conSenal" ? null : "conSenal"))}
          seleccionado={estatusGps === "conSenal"}
          compacto
        />
        <StatCard
          label="Sin señal registrada"
          value={sinSenal.length}
          icon={Radio}
          accent="var(--color-status-revision)"
          onClick={() => setEstatusGps((v) => (v === "sinSenal" ? null : "sinSenal"))}
          seleccionado={estatusGps === "sinSenal"}
          compacto
        />
        <StatCard
          label="Con anomalía en último punto"
          value={conAnomalia.length}
          icon={Satellite}
          accent="var(--color-status-escena)"
          onClick={() => setEstatusGps((v) => (v === "anomalo" ? null : "anomalo"))}
          seleccionado={estatusGps === "anomalo"}
          compacto
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Proyecto
          </span>
          {proyectos.map((p) => {
            const seleccionado = proyectosSeleccionados.includes(p);
            return (
              <button
                key={p}
                onClick={() => alternar(proyectosSeleccionados, setProyectosSeleccionados, p)}
                className="rounded-full px-3 py-1"
                style={{
                  background: seleccionado ? "var(--color-primary)" : "var(--chip)",
                  color: seleccionado ? "#fff" : "var(--field-text)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-sm)",
                  fontWeight: seleccionado ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Tipo de vehículo
          </span>
          {tipos.map((t) => {
            const seleccionado = tiposSeleccionados.includes(t);
            return (
              <button
                key={t}
                onClick={() => alternar(tiposSeleccionados, setTiposSeleccionados, t)}
                className="rounded-full px-3 py-1"
                style={{
                  background: seleccionado ? "var(--color-primary)" : "var(--chip)",
                  color: seleccionado ? "#fff" : "var(--field-text)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-sm)",
                  fontWeight: seleccionado ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        {hayFiltros && (
          <div>
            <button
              onClick={() => {
                setProyectosSeleccionados([]);
                setTiposSeleccionados([]);
                setEstatusGps(null);
              }}
              className="rounded-md px-3 py-1"
              style={{ background: "var(--chip)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}
            >
              Quitar todos los filtros
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <FlotaMap puntos={puntosMapa} ruta={ruta} seleccionado={seleccionada ?? undefined} onSeleccionar={cargarDetalle} />
        {seleccionada && (
          <UnidadPanel
            detalle={detalle}
            cargando={cargandoDetalle}
            onCerrar={() => {
              setSeleccionada(null);
              setDetalle(null);
            }}
            onAmpliarHistorial={() => cargarDetalle(seleccionada, 7)}
          />
        )}
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Última posición conocida
        </h3>
        <PosicionesLista posiciones={filtradas} />
      </div>
    </div>
  );
}
