import Link from "next/link";
import { MapPin, Satellite, History, Radio } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { PosicionForm } from "@/components/mapa/posicion-form";
import { PosicionesLista } from "@/components/mapa/posiciones-lista";
import { requerirPermisoModulo } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  await requerirPermisoModulo("G");

  const unidadesActivas = await prisma.unidad.findMany({
    where: { estatus: "ACTIVO" },
    select: {
      numeroEconomico: true,
      proyecto: { select: { nombre: true } },
      posicionesGps: { orderBy: { timestamp: "desc" }, take: 1 },
    },
    orderBy: { numeroEconomico: "asc" },
  });

  const conSenal = unidadesActivas.filter((u) => u.posicionesGps.length > 0);
  const sinSenal = unidadesActivas.filter((u) => u.posicionesGps.length === 0);
  const conAnomalia = conSenal.filter((u) => u.posicionesGps[0].esAnomalo);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Geolocalización
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Última posición conocida por unidad. El mapa en tiempo real se activa al conectar IntelliHub (Fase 2).
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Unidades activas" value={unidadesActivas.length} icon={MapPin} accent="var(--color-primary)" />
        <StatCard label="Con señal reciente" value={conSenal.length} icon={Radio} accent="var(--color-status-cerrado)" />
        <StatCard label="Sin señal registrada" value={sinSenal.length} icon={Radio} accent="var(--color-status-revision)" />
        <StatCard label="Con anomalía en último punto" value={conAnomalia.length} icon={Satellite} accent="var(--color-status-escena)" />
      </div>

      <PosicionForm unidades={unidadesActivas.map((u) => ({ numeroEconomico: u.numeroEconomico }))} />

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Última posición conocida
        </h3>
        <PosicionesLista
          posiciones={unidadesActivas.map((u) => {
            const p = u.posicionesGps[0];
            return {
              numeroEconomico: u.numeroEconomico,
              proyecto: u.proyecto?.nombre ?? null,
              timestamp: p ? p.timestamp.toISOString() : null,
              lat: p ? Number(p.lat) : null,
              lng: p ? Number(p.lng) : null,
              velocidad: p?.velocidad != null ? Number(p.velocidad) : null,
              esAnomalo: p?.esAnomalo ?? null,
              motivoAnomalia: p?.motivoAnomalia ?? null,
            };
          })}
        />
      </div>
    </div>
  );
}
