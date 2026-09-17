import Link from "next/link";
import { Satellite, History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MapaFlota, type UnidadMapaRow } from "@/components/mapa/mapa-flota";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  await requerirPermisoModulo("G");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("G");

  const unidadesActivas = await prisma.unidad.findMany({
    where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}) },
    select: {
      numeroEconomico: true,
      tipoVehiculo: true,
      proyecto: { select: { nombre: true } },
      posicionesGps: { orderBy: { timestamp: "desc" }, take: 1 },
    },
    orderBy: { numeroEconomico: "asc" },
  });

  const filas: UnidadMapaRow[] = unidadesActivas.map((u) => {
    const p = u.posicionesGps[0];
    return {
      numeroEconomico: u.numeroEconomico,
      tipoVehiculo: TIPO_VEHICULO_LABEL[u.tipoVehiculo] ?? u.tipoVehiculo,
      proyecto: u.proyecto?.nombre ?? null,
      timestamp: p ? p.timestamp.toISOString() : null,
      lat: p ? Number(p.lat) : null,
      lng: p ? Number(p.lng) : null,
      velocidad: p?.velocidad != null ? Number(p.velocidad) : null,
      esAnomalo: p?.esAnomalo ?? null,
      motivoAnomalia: p?.motivoAnomalia ?? null,
    };
  });

  const tipos = Array.from(new Set(filas.map((f) => f.tipoVehiculo))).sort();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Geolocalización
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Posición en vivo de la flota, sincronizada desde Intellihub cada 10 minutos.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/mapa/historial" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <History size={16} /> Historial de recorrido
          </Link>
          <Link href="/mapa/integridad" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <Satellite size={16} /> Integridad de datos (G.1)
          </Link>
        </div>
      </div>

      <MapaFlota unidades={filas} tipos={tipos} />
    </div>
  );
}
