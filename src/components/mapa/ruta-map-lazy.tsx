"use client";

// Envoltura client-only: next/dynamic con ssr:false no se puede usar dentro
// de un Server Component (historial/page.tsx lo es), así que este wrapper
// hace ese import perezoso y el page.tsx simplemente lo renderiza normal.
import dynamic from "next/dynamic";
import type { PuntoRutaHistorial } from "@/components/mapa/ruta-map";

export const RutaMapLazy = dynamic(() => import("@/components/mapa/ruta-map").then((m) => m.RutaMap), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{ height: 420, background: "var(--panel-bg)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)" }}
    >
      Cargando mapa…
    </div>
  ),
});

export type { PuntoRutaHistorial };
