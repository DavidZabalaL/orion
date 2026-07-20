import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { UnidadesTable, type UnidadRow } from "@/components/unidades/unidades-table";
import { Car, CheckCircle2, Ban, ArrowLeftRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UnidadesPage() {
  const unidades = await prisma.unidad.findMany({
    include: {
      proyecto: { select: { nombre: true, estadoRepublica: true } },
      resguardante: { select: { nombre: true } },
    },
    orderBy: { numeroEconomico: "asc" },
  });

  const rows: UnidadRow[] = unidades.map((u) => ({
    numeroEconomico: u.numeroEconomico,
    placas: u.placas,
    tipoVehiculo: u.tipoVehiculo,
    marca: u.marca,
    unidadModelo: u.unidadModelo,
    proyecto: u.proyecto?.nombre ?? null,
    estadoOperacion: u.estadoOperacion,
    estatus: u.estatus,
    disponibilidad: u.disponibilidad,
    diasSinOperar: u.diasSinOperar,
    resguardante: u.resguardante?.nombre ?? null,
  }));

  const total = rows.length;
  const activas = rows.filter((r) => r.estatus === "ACTIVO").length;
  const disponibles = rows.filter((r) => r.disponibilidad).length;
  const enTransito = rows.filter((r) => r.estatus === "CONSIGNACION" || r.estatus === "DIRECCION").length;
  const bajas = rows.filter((r) => r.estatus === "BAJA").length;

  const proyectosOptions = Array.from(new Set(rows.map((r) => r.proyecto).filter(Boolean))) as string[];
  const estadosOptions = Array.from(new Set(rows.map((r) => r.estadoOperacion).filter(Boolean))) as string[];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Inventario de Unidades
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Ficha única por número económico con vista consolidada de flota.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Unidades totales" value={total} icon={Car} accent="var(--color-primary)" />
        <StatCard label="Activas" value={activas} icon={CheckCircle2} accent="var(--color-status-cerrado)" />
        <StatCard label="Disponibles" value={disponibles} icon={CheckCircle2} accent="var(--color-status-cerrado)" />
        <StatCard label="En consignación / dirección" value={enTransito} icon={ArrowLeftRight} accent="var(--color-status-revision)" />
        <StatCard label="Bajas" value={bajas} icon={Ban} accent="var(--color-status-escena)" />
      </div>

      <UnidadesTable rows={rows} proyectos={proyectosOptions} estados={estadosOptions} />
    </div>
  );
}
