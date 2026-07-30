import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ChecklistForm } from "@/components/checklist/checklist-form";
import { ChecklistLista } from "@/components/checklist/checklist-lista";
import { PUNTOS_INSPECCION } from "@/lib/checklist";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function ChecklistPage() {
  await requerirPermisoModulo("A.1");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A.1");
  const filtroProyecto = proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {};

  const [unidades, checklistsHoy, sinCapturaHoy] = await Promise.all([
    prisma.unidad.findMany({
      where: { estatus: "ACTIVO", ...filtroProyecto },
      select: { numeroEconomico: true, marca: true, unidadModelo: true, tipoVehiculo: true },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.checklist.findMany({
      where: { fecha: { gte: inicioDeHoy() }, ...(proyectosPermitidos !== null ? { unidad: filtroProyecto } : {}) },
      include: { unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } } },
      orderBy: { fecha: "desc" },
    }),
    prisma.unidad.findMany({
      where: { estatus: "ACTIVO", checklists: { none: { fecha: { gte: inicioDeHoy() } } }, ...filtroProyecto },
      select: { numeroEconomico: true },
    }),
  ]);

  const serializado = JSON.parse(JSON.stringify(checklistsHoy));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Checklist diario
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Inspección diaria con lectura de odómetro obligatoria — reemplaza el formulario de Fast Field.
          </p>
        </div>
        <Link href="/checklist/historial" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <CalendarDays size={16} /> Historial por fecha / exportar
        </Link>
      </div>

      {sinCapturaHoy.length > 0 && (
        <div className="rounded-md px-4 py-3" style={{ background: "var(--status-revision-bg)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-revision)" }}>
          {sinCapturaHoy.length} unidad(es) activa(s) sin checklist capturado hoy: {sinCapturaHoy.map((u) => u.numeroEconomico).join(", ")}
        </div>
      )}

      <ChecklistForm unidades={unidades} puntos={PUNTOS_INSPECCION} />

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Capturados hoy
        </h3>
        <ChecklistLista checklists={serializado} />
      </div>
    </div>
  );
}
