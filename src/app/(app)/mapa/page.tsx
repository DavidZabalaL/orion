import Link from "next/link";
import { Satellite, History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { MapaFlota, type UnidadMapaRow } from "@/components/mapa/mapa-flota";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

// Revalidación cada 60s o inmediata cuando el cron de Intellihub registra lecturas (revalidatePath("/mapa"))
export const revalidate = 60;

type UnidadRowRaw = {
  numeroEconomico: string;
  tipoVehiculo: string;
  disponibilidad: boolean;
  marca: string;
  unidadModelo: string;
  proyecto: string | null;
  lat: number | null;
  lng: number | null;
  velocidad: number | null;
  timestamp: Date | null;
  esAnomalo: boolean | null;
  motivoAnomalia: string | null;
};

export default async function MapaPage() {
  await requerirPermisoModulo("G");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("G");

  const filtroProyecto =
    proyectosPermitidos !== null
      ? proyectosPermitidos.length > 0
        ? Prisma.sql`AND u."proyectoId" IN (${Prisma.join(proyectosPermitidos)})`
        : Prisma.sql`AND 1=0`
      : Prisma.empty;

  // Consulta optimizada con LATERAL join: aprovecha el índice compuesto (numeroEconomico, timestamp DESC)
  // para obtener solo el último punto por unidad activa en ~140ms, en lugar de escanear >400,000 filas.
  const unidadesActivas = await prisma.$queryRaw<UnidadRowRaw[]>`
    SELECT 
      u."numeroEconomico",
      u."tipoVehiculo"::text AS "tipoVehiculo",
      u."disponibilidad",
      u."marca",
      u."unidadModelo",
      pr."nombre" AS "proyecto",
      p."lat"::float8 AS "lat",
      p."lng"::float8 AS "lng",
      p."velocidad"::float8 AS "velocidad",
      p."timestamp",
      p."esAnomalo",
      p."motivoAnomalia"::text AS "motivoAnomalia"
    FROM "Unidad" u
    LEFT JOIN "Proyecto" pr ON u."proyectoId" = pr."id"
    LEFT JOIN LATERAL (
      SELECT "lat", "lng", "velocidad", "timestamp", "esAnomalo", "motivoAnomalia"
      FROM "PosicionGPS"
      WHERE "numeroEconomico" = u."numeroEconomico"
      ORDER BY "timestamp" DESC
      LIMIT 1
    ) p ON true
    WHERE u."estatus" = 'ACTIVO'
      ${filtroProyecto}
    ORDER BY u."numeroEconomico" ASC;
  `;

  const filas: UnidadMapaRow[] = unidadesActivas.map((u) => ({
    numeroEconomico: u.numeroEconomico,
    tipoVehiculo: TIPO_VEHICULO_LABEL[u.tipoVehiculo] ?? u.tipoVehiculo,
    disponibilidad: u.disponibilidad,
    descripcion: `${u.marca} ${u.unidadModelo}`,
    proyecto: u.proyecto ?? null,
    timestamp: u.timestamp ? u.timestamp.toISOString() : null,
    lat: u.lat != null ? Number(u.lat) : null,
    lng: u.lng != null ? Number(u.lng) : null,
    velocidad: u.velocidad != null ? Number(u.velocidad) : null,
    esAnomalo: u.esAnomalo ?? null,
    motivoAnomalia: u.motivoAnomalia ?? null,
  }));

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
