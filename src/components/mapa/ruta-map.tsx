"use client";

// Mapa de un solo recorrido histórico (Leaflet + OpenStreetMap) — usado en
// /mapa/historial. Aislado de flota-map.tsx (que dibuja MUCHAS unidades a la
// vez) porque aquí la ruta se pinta con gradiente por tiempo, como en el
// mockup de referencia: azul (más antiguo) → rojo (más reciente).
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fmtFechaHora } from "@/lib/formato";

export type PuntoRutaHistorial = { lat: number; lng: number; timestamp: string };

const AZUL: [number, number, number] = [59, 130, 246];
const ROJO: [number, number, number] = [239, 68, 68];

function colorEntreTiempo(fraccion: number): string {
  const [r1, g1, b1] = AZUL;
  const [r2, g2, b2] = ROJO;
  const r = Math.round(r1 + (r2 - r1) * fraccion);
  const g = Math.round(g1 + (g2 - g1) * fraccion);
  const b = Math.round(b1 + (b2 - b1) * fraccion);
  return `rgb(${r},${g},${b})`;
}

function iconoPunto(color: string, forma: "circulo" | "cuadro"): L.DivIcon {
  const html =
    forma === "circulo"
      ? `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.3)"></span>`
      : `<span style="display:block;width:14px;height:14px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.3);transform:rotate(45deg)"></span>`;
  return L.divIcon({ className: "", html, iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8] });
}

function AjustarVista({ ruta }: { ruta: PuntoRutaHistorial[] }) {
  const map = useMap();
  useEffect(() => {
    if (ruta.length === 0) return;
    map.fitBounds(
      ruta.map((p) => [p.lat, p.lng] as [number, number]),
      { padding: [40, 40], maxZoom: 15 }
    );
  }, [ruta, map]);
  return null;
}

export function RutaMap({ ruta }: { ruta: PuntoRutaHistorial[] }) {
  const segmentos = useMemo(() => {
    if (ruta.length < 2) return [];
    return ruta.slice(1).map((p, i) => ({
      posiciones: [
        [ruta[i].lat, ruta[i].lng],
        [p.lat, p.lng],
      ] as [number, number][],
      color: colorEntreTiempo(i / (ruta.length - 2 || 1)),
    }));
  }, [ruta]);

  if (ruta.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl"
        style={{ height: 420, background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)" }}
      >
        Sin lecturas GPS en el rango seleccionado.
      </div>
    );
  }

  const inicio = ruta[0];
  const fin = ruta[ruta.length - 1];

  return (
    <MapContainer center={[inicio.lat, inicio.lng]} zoom={12} style={{ height: "420px", width: "100%", borderRadius: "var(--radius-lg, 12px)" }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AjustarVista ruta={ruta} />
      {segmentos.map((s, i) => (
        <Polyline key={i} positions={s.posiciones} pathOptions={{ color: s.color, weight: 4, opacity: 0.85 }} />
      ))}
      <Marker position={[inicio.lat, inicio.lng]} icon={iconoPunto("rgb(59,130,246)", "circulo")}>
        <Popup>Inicio · {fmtFechaHora(inicio.timestamp)}</Popup>
      </Marker>
      {ruta.length > 1 && (
        <Marker position={[fin.lat, fin.lng]} icon={iconoPunto("rgb(239,68,68)", "cuadro")}>
          <Popup>Fin · {fmtFechaHora(fin.timestamp)}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
