"use client";

// Mapa en vivo de la flota (Leaflet + OpenStreetMap, sin API key). Aislado en
// su propio archivo para poder cargarlo con next/dynamic({ ssr: false }) —
// Leaflet toca `window`/`document` al importarse y truena en el render de
// servidor de Next.
import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { fmtFechaHora } from "@/lib/formato";

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

const CENTRO_MEXICO: [number, number] = [23.6345, -102.5528];

function colorDePunto(p: PuntoMapa): string {
  if (p.esAnomalo) return "var(--color-status-escena)";
  return "var(--color-status-cerrado)";
}

function icono(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.25)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  });
}

export function FlotaMap({ puntos }: { puntos: PuntoMapa[] }) {
  const iconos = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    return (p: PuntoMapa) => {
      const color = colorDePunto(p);
      if (!cache.has(color)) cache.set(color, icono(color));
      return cache.get(color)!;
    };
  }, []);

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
      {puntos.map((p) => (
        <Marker key={p.numeroEconomico} position={[p.lat, p.lng]} icon={iconos(p)}>
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
        </Marker>
      ))}
    </MapContainer>
  );
}
