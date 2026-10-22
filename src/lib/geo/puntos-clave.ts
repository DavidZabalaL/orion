export type CapaInfo = {
  id: string;
  nombre: string;
  archivo: string;
  region: string;
  categoria: string;
  icono: string;
  color: string;
  totalPuntos: number;
  activoPorDefecto: boolean;
};

export type ManifestCapas = {
  actualizado: string;
  totalCapas: number;
  totalPuntosGlobal: number;
  capas: CapaInfo[];
};

export type PuntoClavePropiedades = {
  nombre: string;
  municipio?: string;
  descripcion?: string;
  categoria: string;
  region: string;
};

export type PuntoClaveFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  properties: PuntoClavePropiedades;
};

export type GeoJSONPuntosClave = {
  type: "FeatureCollection";
  features: PuntoClaveFeature[];
};

/**
 * Fórmula de Haversine para calcular distancia geodésica entre dos puntos en km.
 */
export function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Encuentra el punto clave más cercano a una posición GPS dada.
 */
export function encontrarPuntoClaveMasCercano(
  lat: number,
  lng: number,
  puntos: PuntoClaveFeature[]
): { punto: PuntoClaveFeature; distanciaKm: number } | null {
  if (!puntos.length) return null;
  let masCercano: PuntoClaveFeature | null = null;
  let minDistancia = Infinity;

  for (const p of puntos) {
    const [pLng, pLat] = p.geometry.coordinates;
    const dist = calcularDistanciaKm(lat, lng, pLat, pLng);
    if (dist < minDistancia) {
      minDistancia = dist;
      masCercano = p;
    }
  }

  if (!masCercano) return null;
  return { punto: masCercano, distanciaKm: Math.round(minDistancia * 100) / 100 };
}
