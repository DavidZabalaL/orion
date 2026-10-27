"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Satellite, Radio, Maximize2, Minimize2, ChevronUp, ChevronDown } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { PosicionesLista, type PosicionRow } from "@/components/mapa/posiciones-lista";
import { UnidadPanel, type DetalleUnidad } from "@/components/mapa/unidad-panel";
import type { PuntoMapa, PuntoRuta } from "@/components/mapa/flota-map";
import { encontrarPuntoClaveMasCercano, type PuntoClaveFeature } from "@/lib/geo/puntos-clave";

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
  const [busqueda, setBusqueda] = useState("");
  const [proyectosSeleccionados, setProyectosSeleccionados] = useState<string[]>([]);
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([]);
  const [estatusGps, setEstatusGps] = useState<EstatusGps | null>(null);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleUnidad | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [puntosClave, setPuntosClave] = useState<PuntoClaveFeature[]>([]);
  const [mapaExpandido, setMapaExpandido] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);

  const mapaContenedorRef = useRef<HTMLDivElement>(null);
  const buscadorContenedorRef = useRef<HTMLDivElement>(null);

  function alternarMapaExpandido() {
    setMapaExpandido((prev) => {
      const siguiente = !prev;
      if (siguiente) {
        setTimeout(() => {
          buscadorContenedorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
      return siguiente;
    });
  }

  function alternarPantallaCompleta() {
    setPantallaCompleta((prev) => !prev);
  }

  useEffect(() => {
    function alTecla(e: KeyboardEvent) {
      if (e.key === "Escape" && pantallaCompleta) {
        setPantallaCompleta(false);
      }
    }
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [pantallaCompleta]);

  const instalacionCercana = useMemo(() => {
    if (!detalle?.ultima || !puntosClave.length) return null;
    const res = encontrarPuntoClaveMasCercano(detalle.ultima.lat, detalle.ultima.lng, puntosClave);
    if (!res) return null;
    return {
      nombre: res.punto.properties.nombre,
      categoria: res.punto.properties.categoria,
      region: res.punto.properties.region,
      distanciaKm: res.distanciaKm,
    };
  }, [detalle, puntosClave]);

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

  const seleccionarUnidad = useCallback((numeroEconomico: string) => {
    setSugerenciasAbiertas(false);
    cargarDetalle(numeroEconomico);
    mapaContenedorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [cargarDetalle]);

  useEffect(() => {
    function alClickFuera(e: MouseEvent) {
      if (buscadorContenedorRef.current && !buscadorContenedorRef.current.contains(e.target as Node)) {
        setSugerenciasAbiertas(false);
      }
    }
    document.addEventListener("mousedown", alClickFuera);
    return () => document.removeEventListener("mousedown", alClickFuera);
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
    const q = busqueda.trim().toUpperCase();
    return unidades.filter((u) => {
      if (q && !u.numeroEconomico.toUpperCase().includes(q)) return false;
      if (proyectosSeleccionados.length && !proyectosSeleccionados.includes(u.proyecto ?? "Sin proyecto")) return false;
      if (tiposSeleccionados.length && !tiposSeleccionados.includes(u.tipoVehiculo)) return false;
      if (estatusGps === "sinSenal" && u.timestamp !== null) return false;
      if (estatusGps === "conSenal" && (u.timestamp === null || u.esAnomalo)) return false;
      if (estatusGps === "anomalo" && !u.esAnomalo) return false;
      return true;
    });
  }, [unidades, busqueda, proyectosSeleccionados, tiposSeleccionados, estatusGps]);

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

  const hayFiltros = busqueda.trim() !== "" || proyectosSeleccionados.length > 0 || tiposSeleccionados.length > 0 || estatusGps !== null;

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
                setBusqueda("");
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

      <div className="flex flex-wrap items-center justify-between gap-3" ref={buscadorContenedorRef}>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <BuscadorTexto
            value={busqueda}
            onChange={(v) => {
              setBusqueda(v);
              setSugerenciasAbiertas(true);
            }}
            onFocus={() => {
              setSugerenciasAbiertas(true);
              if (mapaExpandido) setMapaExpandido(false);
            }}
            onClick={() => {
              setSugerenciasAbiertas(true);
              if (mapaExpandido) setMapaExpandido(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtradas.length > 0) {
                e.preventDefault();
                seleccionarUnidad(filtradas[0].numeroEconomico);
              }
            }}
            placeholder="Buscar número económico…"
            className="w-full"
          />

          {sugerenciasAbiertas && busqueda.trim().length > 0 && (
            <div
              className="absolute left-0 top-full mt-1.5 w-full rounded-xl overflow-hidden z-30 shadow-lg border"
              style={{ background: "var(--panel-bg)", borderColor: "var(--field-border)" }}
            >
              {filtradas.length === 0 ? (
                <div className="px-4 py-3 text-xs" style={{ color: "var(--sidebar-text)" }}>
                  Sin unidades que coincidan con &ldquo;{busqueda}&rdquo;
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--sidebar-text)", borderBottom: "1px solid var(--field-border)" }}>
                    Coincidencias ({filtradas.length}) · Enter o clic para ubicar en mapa
                  </div>
                  {filtradas.slice(0, 8).map((u) => (
                    <button
                      key={u.numeroEconomico}
                      type="button"
                      onClick={() => seleccionarUnidad(u.numeroEconomico)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--chip)] transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid var(--field-border)" }}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-[var(--color-primary)] shrink-0" />
                        <div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                            {u.numeroEconomico}
                          </div>
                          <div className="truncate text-xs" style={{ color: "var(--sidebar-text)" }}>
                            {u.descripcion} {u.proyecto ? `· ${u.proyecto}` : ""}
                          </div>
                        </div>
                      </div>
                      <div>
                        {u.timestamp === null ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--chip)", color: "var(--sidebar-text)" }}>
                            Sin señal
                          </span>
                        ) : u.esAnomalo ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)" }}>
                            Anómalo
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--status-cerrado-bg)", color: "var(--color-status-cerrado)" }}>
                            Válido
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={alternarMapaExpandido}
            className="flex items-center gap-2 rounded-md px-3.5 h-10 transition-colors font-medium text-sm"
            style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--field-border)",
              color: "var(--sidebar-text-active)",
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
            }}
            title={mapaExpandido ? "Reducir mapa a tamaño normal" : "Ampliar mapa"}
          >
            {mapaExpandido ? (
              <>
                <Minimize2 size={15} /> Reducir mapa
              </>
            ) : (
              <>
                <Maximize2 size={15} /> Ampliar mapa
              </>
            )}
          </button>
          <button
            type="button"
            onClick={alternarPantallaCompleta}
            className="flex items-center gap-1.5 rounded-md px-3 h-10 transition-colors font-medium text-sm"
            style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--field-border)",
              color: "var(--sidebar-text-active)",
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
            }}
            title="Ver en pantalla completa"
          >
            <Maximize2 size={15} />
            <span className="hidden sm:inline text-xs">Pantalla completa</span>
          </button>
        </div>
      </div>

      <div
        className={
          pantallaCompleta
            ? "fixed inset-0 z-[1000] p-3 md:p-4 flex flex-col gap-2"
            : "relative"
        }
        style={pantallaCompleta ? { background: "var(--color-bg)" } : undefined}
        ref={mapaContenedorRef}
      >
        {pantallaCompleta && (
          <div
            className="flex items-center justify-between gap-3 pb-2 border-b"
            style={{ borderColor: "var(--field-border)" }}
          >
            <div className="flex items-center gap-3">
              <h2
                style={{
                  fontFamily: "var(--font)",
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  color: "var(--sidebar-text-active)",
                }}
              >
                Geolocalización en vivo
              </h2>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: "var(--chip)", color: "var(--sidebar-text)" }}
              >
                {filtradas.length} {filtradas.length === 1 ? "unidad" : "unidades"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPantallaCompleta(false)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors text-xs font-semibold cursor-pointer"
              style={{
                background: "var(--panel-bg)",
                border: "1px solid var(--field-border)",
                color: "var(--sidebar-text-active)",
              }}
            >
              <Minimize2 size={14} /> Salir de pantalla completa (Esc)
            </button>
          </div>
        )}
        <div className={pantallaCompleta ? "relative flex-1 min-h-0 w-full" : "relative w-full"}>
          <FlotaMap
            puntos={puntosMapa}
            ruta={ruta}
            seleccionado={seleccionada ?? undefined}
            onSeleccionar={seleccionarUnidad}
            onPuntosClaveCargados={setPuntosClave}
            expandido={mapaExpandido}
            pantallaCompleta={pantallaCompleta}
            onTogglePantallaCompleta={alternarPantallaCompleta}
          />
          {seleccionada && (
            <UnidadPanel
              detalle={detalle}
              instalacionCercana={instalacionCercana}
              cargando={cargandoDetalle}
              onCerrar={() => {
                setSeleccionada(null);
                setDetalle(null);
              }}
              onAmpliarHistorial={() => cargarDetalle(seleccionada, 7)}
            />
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Última posición conocida
            </h3>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "var(--chip)", color: "var(--sidebar-text)" }}>
              {filtradas.length} {filtradas.length === 1 ? "unidad" : "unidades"}
            </span>
          </div>
          <button
            type="button"
            onClick={alternarMapaExpandido}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors text-xs font-semibold"
            style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--field-border)",
              color: "var(--sidebar-text-active)",
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
            }}
          >
            {mapaExpandido ? (
              <>
                <ChevronDown size={14} /> Mostrar lista de unidades
              </>
            ) : (
              <>
                <ChevronUp size={14} /> Minimizar lista y ampliar mapa
              </>
            )}
          </button>
        </div>

        {mapaExpandido ? (
          <div
            onClick={() => setMapaExpandido(false)}
            className="flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-[var(--chip)] transition-colors border"
            style={{ background: "var(--panel-bg)", borderColor: "var(--field-border)" }}
          >
            <span className="text-sm" style={{ color: "var(--sidebar-text)" }}>
              Lista de unidades minimizada ({filtradas.length} unidades). Haz clic aquí o en el buscador para verla completa.
            </span>
            <span
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: "var(--color-primary)" }}
            >
              <ChevronDown size={14} /> Desplegar
            </span>
          </div>
        ) : (
          <PosicionesLista
            posiciones={filtradas}
            seleccionada={seleccionada}
            onSeleccionar={seleccionarUnidad}
          />
        )}
      </div>
    </div>
  );
}
