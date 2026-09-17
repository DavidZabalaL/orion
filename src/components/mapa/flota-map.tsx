"use client";

// Mapa en vivo de la flota (Leaflet + OpenStreetMap, sin API key). Aislado en
// su propio archivo para poder cargarlo con next/dynamic({ ssr: false }) —
// Leaflet toca `window`/`document` al importarse y truena en el render de
// servidor de Next.
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { fmtFechaHora } from "@/lib/formato";

const ZOOM_UNIDAD_SELECCIONADA = 13;

export type PuntoMapa = {
  numeroEconomico: string;
  proyecto: string | null;
  lat: number;
  lng: number;
  timestamp: string;
  velocidad: number | null;
  esAnomalo: boolean;
  motivoAnomalia: string | null;
};

export type PuntoRuta = { lat: number; lng: number };

const CENTRO_MEXICO: [number, number] = [23.6345, -102.5528];

function colorDePunto(p: PuntoMapa, seleccionado: boolean): string {
  if (p.esAnomalo) return "var(--color-status-escena)";
  if (seleccionado) return "var(--color-primary)";
  return "var(--color-status-cerrado)";
}

function icono(color: string, grande: boolean): L.DivIcon {
  const tam = grande ? 18 : 14;
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${tam}px;height:${tam}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.25)"></span>`,
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam / 2],
    popupAnchor: [0, -tam / 2],
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
      const clave = colorDePunto(p, esSeleccionado) + (esSeleccionado ? ":sel" : "");
      if (!cache.has(clave)) cache.set(clave, icono(colorDePunto(p, esSeleccionado), esSeleccionado));
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
    </MapContainer>
  );
}
