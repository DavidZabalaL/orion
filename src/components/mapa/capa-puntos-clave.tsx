"use client";

import { useEffect, useState, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker, Popup, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { Building2, ScanLine, Radio, TowerControl, Video, MapPin } from "lucide-react";
import type { CapaInfo, GeoJSONPuntosClave, PuntoClaveFeature } from "@/lib/geo/puntos-clave";

import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const ICONOS_MAPA: Record<string, typeof Building2> = {
  Building2,
  ScanLine,
  Radio,
  TowerControl,
  Video,
  MapPin,
};

function crearIconoPuntoClave(iconoNombre: string, color: string, categoria: string): L.DivIcon {
  const IconoComponente = ICONOS_MAPA[iconoNombre] ?? MapPin;
  const esPrincipal = categoria.toLowerCase().includes("subcentro") || categoria.toLowerCase().includes("arco");
  const tam = esPrincipal ? 26 : 22;
  const svg = renderToStaticMarkup(<IconoComponente color="#ffffff" size={Math.round(tam * 0.6)} strokeWidth={2.3} />);
  
  // Forma redondeada suave (squircle) para diferenciarse de los vehículos redondos al acercar el zoom
  return L.divIcon({
    className: "punto-clave-marker",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${tam}px;height:${tam}px;border-radius:6px;background:${color};border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:pointer;">${svg}</span>`,
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam / 2],
    popupAnchor: [0, -tam / 2],
    tooltipAnchor: [0, -tam / 2],
  });
}

/**
 * Globo que agrupa puntos clave cercanos al alejar el zoom (estilo idéntico
 * a los clusters circulares de unidades de flota, con tono índigo distintivo).
 */
function iconoClusterPuntos(cluster: { getChildCount: () => number }): L.DivIcon {
  const cantidad = cluster.getChildCount();
  const tam = cantidad > 999 ? 36 : cantidad > 99 ? 32 : 28;
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${tam}px;height:${tam}px;border-radius:50%;background:#4f46e5;color:#fff;font:700 12px var(--font-ui, sans-serif);box-shadow:0 0 0 2px #fff, 0 0 0 3px rgba(79, 70, 229, 0.4);cursor:pointer;">${cantidad}</span>`,
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam / 2],
  });
}

const cacheGeoJson: Record<string, PuntoClaveFeature[]> = {};

export function CapaPuntosClave({
  capasActivas,
  manifestCapas,
  onPuntosCargados,
}: {
  capasActivas: string[];
  manifestCapas: CapaInfo[];
  onPuntosCargados?: (puntos: PuntoClaveFeature[]) => void;
}) {
  const [datosCapas, setDatosCapas] = useState<Record<string, PuntoClaveFeature[]>>(cacheGeoJson);

  // Cargar datos GeoJSON cuando una capa se activa y no está en caché
  useEffect(() => {
    capasActivas.forEach(async (capaId) => {
      if (cacheGeoJson[capaId]) {
        setDatosCapas((prev) => (prev[capaId] ? prev : { ...prev, [capaId]: cacheGeoJson[capaId] }));
        return;
      }
      const info = manifestCapas.find((c) => c.id === capaId);
      if (!info) return;

      try {
        const res = await fetch(`/data/puntos-clave/${info.archivo}`);
        if (res.ok) {
          const json: GeoJSONPuntosClave = await res.json();
          cacheGeoJson[capaId] = json.features;
          setDatosCapas((prev) => ({
            ...prev,
            [capaId]: json.features,
          }));
        }
      } catch (err) {
        console.error(`Error al cargar capa ${capaId}:`, err);
      }
    });
  }, [capasActivas, manifestCapas]);

  // Consolidar todos los puntos activos para el callback de cercanía
  const todosLosPuntosActivos = useMemo(() => {
    const todos: PuntoClaveFeature[] = [];
    capasActivas.forEach((id) => {
      if (datosCapas[id]) {
        todos.push(...datosCapas[id]);
      }
    });
    return todos;
  }, [capasActivas, datosCapas]);

  useEffect(() => {
    if (onPuntosCargados) {
      onPuntosCargados(todosLosPuntosActivos);
    }
  }, [todosLosPuntosActivos, onPuntosCargados]);

  // Renderizar marcadores agrupados
  const marcadores = useMemo(() => {
    const lista: React.ReactNode[] = [];

    capasActivas.forEach((capaId) => {
      const info = manifestCapas.find((c) => c.id === capaId);
      const puntos = datosCapas[capaId];
      if (!info || !puntos || puntos.length === 0) return;

      const icono = crearIconoPuntoClave(info.icono, info.color, info.categoria);

      puntos.forEach((p, idx) => {
        const [lng, lat] = p.geometry.coordinates;
        const { nombre, municipio, categoria, region, descripcion } = p.properties;

        lista.push(
          <Marker key={`${capaId}-${idx}`} position={[lat, lng]} icon={icono}>
            <Tooltip direction="top" offset={[0, -4]} opacity={0.96} className="orion-map-tooltip">
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700, color: "var(--sidebar-text-active)" }}>{nombre}</div>
                <div style={{ color: "var(--sidebar-text)", fontSize: 11 }}>
                  {categoria} {municipio ? `· ${municipio}` : ""}
                </div>
              </div>
            </Tooltip>

            <Popup>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  minWidth: 200,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: info.color,
                    }}
                  />
                  <strong style={{ fontSize: 14, color: "var(--sidebar-text-active)" }}>{nombre}</strong>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "var(--chip, #f1f5f9)",
                      color: "var(--sidebar-text, #475569)",
                      fontWeight: 600,
                    }}
                  >
                    {categoria}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "var(--chip, #f1f5f9)",
                      color: "var(--sidebar-text, #475569)",
                    }}
                  >
                    {region}
                  </span>
                </div>

                {municipio && (
                  <div style={{ fontSize: 12, color: "var(--sidebar-text)" }}>
                    Municipio: <strong style={{ color: "var(--sidebar-text-active)" }}>{municipio}</strong>
                  </div>
                )}

                {descripcion && (
                  <div style={{ fontSize: 12, color: "var(--sidebar-text)", fontStyle: "italic" }}>
                    {descripcion}
                  </div>
                )}

                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    color: "var(--sidebar-text)",
                    borderTop: "1px solid var(--border-color, #e2e8f0)",
                    paddingTop: 4,
                    marginTop: 2,
                  }}
                >
                  GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      });
    });

    return lista;
  }, [capasActivas, datosCapas, manifestCapas]);

  if (marcadores.length === 0) return null;

  return (
    <MarkerClusterGroup
      chunkedLoading
      iconCreateFunction={iconoClusterPuntos}
      showCoverageOnHover={false}
      maxClusterRadius={50}
    >
      {marcadores}
    </MarkerClusterGroup>
  );
}
