"use client";

// Mapa en vivo de la flota (Leaflet + OpenStreetMap, sin API key). Aislado en
// su propio archivo para poder cargarlo con next/dynamic({ ssr: false }) —
// Leaflet toca `window`/`document` al importarse y truena en el render de
// servidor de Next.
import { useEffect, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { Car, Truck, Forklift, Scooter } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { fmtFechaHora } from "@/lib/formato";

const ZOOM_UNIDAD_SELECCIONADA = 13;

export type PuntoMapa = {
  numeroEconomico: string;
  proyecto: string | null;
  tipoVehiculo: string;
  disponibilidad: boolean;
  lat: number;
  lng: number;
  timestamp: string;
  velocidad: number | null;
  esAnomalo: boolean;
  motivoAnomalia: string | null;
};

export type PuntoRuta = { lat: number; lng: number };

const CENTRO_MEXICO: [number, number] = [23.6345, -102.5528];

/** Disponible = verde, no disponible = rojo — el color del ícono manda sobre
 *  cualquier otro estado; una lectura anómala se marca aparte con un anillo
 *  ámbar (ver `icono`), para no competir por el mismo canal de color. */
function colorDePunto(p: PuntoMapa): string {
  return p.disponibilidad ? "var(--color-status-cerrado)" : "var(--color-status-escena)";
}

// PuntoMapa.tipoVehiculo llega como la etiqueta en español (TIPO_VEHICULO_LABEL,
// ya resuelta en mapa/page.tsx), no el enum crudo — se indexa igual aquí.
// lucide-react no tiene un ícono dedicado de grúa ni de moto — se usan los más
// parecidos por silueta: Forklift (brazo/mástil vertical) en vez de
// Construction (que es un cono de obra, no un vehículo), y Scooter (moto
// scooter) en vez de Bike (bicicleta de pedales).
const ICONO_POR_TIPO: Record<string, typeof Car> = {
  Auto: Car,
  Camioneta: Truck,
  Grúa: Forklift,
  Moto: Scooter,
  Otro: Car,
};

function icono(p: PuntoMapa, color: string, seleccionado: boolean): L.DivIcon {
  const tam = seleccionado ? 30 : 24;
  const IconoTipo = ICONO_POR_TIPO[p.tipoVehiculo] ?? Car;
  const svg = renderToStaticMarkup(<IconoTipo color="#fff" size={Math.round(tam * 0.58)} strokeWidth={2.5} />);
  const anillo = p.esAnomalo ? "0 0 0 2px #fff, 0 0 0 4px var(--color-status-revision, #f59e0b)" : "0 0 0 2px #fff, 0 0 0 3px rgba(0,0,0,0.2)";
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${tam}px;height:${tam}px;border-radius:50%;background:${color};box-shadow:${anillo}">${svg}</span>`,
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam / 2],
    popupAnchor: [0, -tam / 2],
    tooltipAnchor: [0, -tam / 2],
  });
}

/**
 * Encuadra el mapa en la unidad seleccionada cada vez que cambia — con 2+
 * puntos ajusta a la ruta completa; con 1 solo punto (ej. unidad con una
 * única lectura GPS) simplemente centra y hace zoom ahí, porque fitBounds
 * con un solo punto no mueve el mapa en absoluto.
 */
function AjustarVistaRuta({ ruta }: { ruta: PuntoRuta[] }) {
  const map = useMap();
  useEffect(() => {
    if (ruta.length === 0) return;
    if (ruta.length === 1) {
      map.setView([ruta[0].lat, ruta[0].lng], ZOOM_UNIDAD_SELECCIONADA);
      return;
    }
    map.fitBounds(
      ruta.map((p) => [p.lat, p.lng] as [number, number]),
      { padding: [40, 40], maxZoom: 14 }
    );
  }, [ruta, map]);
  return null;
}

export function FlotaMap({
  puntos,
  ruta = [],
  seleccionado,
  onSeleccionar,
}: {
  puntos: PuntoMapa[];
  ruta?: PuntoRuta[];
  seleccionado?: string;
  onSeleccionar?: (numeroEconomico: string) => void;
}) {
  const iconos = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    return (p: PuntoMapa) => {
      const esSeleccionado = p.numeroEconomico === seleccionado;
      const clave = `${p.tipoVehiculo}:${colorDePunto(p)}:${p.esAnomalo}:${esSeleccionado}`;
      if (!cache.has(clave)) cache.set(clave, icono(p, colorDePunto(p), esSeleccionado));
      return cache.get(clave)!;
    };
  }, [seleccionado]);

  const centro: [number, number] =
    puntos.length > 0
      ? [puntos.reduce((s, p) => s + p.lat, 0) / puntos.length, puntos.reduce((s, p) => s + p.lng, 0) / puntos.length]
      : CENTRO_MEXICO;

  return (
    <MapContainer
      center={centro}
      zoom={puntos.length > 0 ? 6 : 5}
      style={{ height: "520px", width: "100%", borderRadius: "var(--radius-lg, 12px)" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {ruta.length > 0 && <AjustarVistaRuta ruta={ruta} />}
      {ruta.length > 1 && (
        <Polyline positions={ruta.map((p) => [p.lat, p.lng])} pathOptions={{ color: "var(--color-primary, #2563eb)", weight: 3, opacity: 0.8 }} />
      )}
      {puntos.map((p) => (
        <Marker
          key={p.numeroEconomico}
          position={[p.lat, p.lng]}
          icon={iconos(p)}
          eventHandlers={onSeleccionar ? { click: () => onSeleccionar(p.numeroEconomico) } : undefined}
        >
          {/* Al pasar el mouse: número económico, proyecto y tipo de vehículo — independiente del click (Popup/panel). */}
          <Tooltip direction="top" offset={[0, -4]} opacity={1} className="orion-map-tooltip">
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700, color: "var(--sidebar-text-active)" }}>{p.numeroEconomico}</div>
              {p.proyecto && <div style={{ color: "var(--sidebar-text)" }}>{p.proyecto}</div>}
              <div style={{ color: "var(--sidebar-text)" }}>{p.tipoVehiculo}</div>
            </div>
          </Tooltip>
          {/* Sin onSeleccionar (no hay panel flotante que lo reemplace) sí mostramos el popup nativo de Leaflet. */}
          {!onSeleccionar && (
            <Popup>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                <Link href={`/unidades/${p.numeroEconomico}`} style={{ fontWeight: 700 }}>
                  {p.numeroEconomico}
                </Link>
                {p.proyecto && <span>{p.proyecto}</span>}
                <span>{fmtFechaHora(p.timestamp)}</span>
                {p.velocidad != null && <span>{p.velocidad.toFixed(0)} km/h</span>}
                {p.esAnomalo && <span style={{ color: "#c0392b", fontWeight: 600 }}>{p.motivoAnomalia ?? "Lectura anómala"}</span>}
              </div>
            </Popup>
          )}
        </Marker>
      ))}
      <style>{`
        .orion-map-tooltip { background: var(--panel-bg); border: none; border-radius: var(--radius-md, 8px); box-shadow: var(--shadow-sm); padding: 6px 10px; }
        .orion-map-tooltip::before { display: none; }
      `}</style>
    </MapContainer>
  );
}
