import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ChecklistLista } from "@/components/checklist/checklist-lista";
import { ChecklistSemanalLista } from "@/components/checklist/checklist-semanal-lista";
import { ChecklistEntrada } from "@/components/checklist/checklist-entrada";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { inicioDeHoyMx as inicioDeHoy } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  await requerirPermisoModulo("A.1");

  const proyectosPermitidos = await proyectosPermitidosParaModulo("A.1");
  const filtroProyecto = proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {};
  const esAdmin = proyectosPermitidos === null;

  const inicioHoy = inicioDeHoy();
  const fechaHoraActual = new Date().toISOString();

  const [unidades, proyectos, checklistsDiarios, checklistsSemanales, sinCapturaHoy] = await Promise.all([
    prisma.unidad.findMany({
      where: { estatus: "ACTIVO", ...filtroProyecto },
      select: {
        numeroEconomico: true,
        marca: true,
        unidadModelo: true,
        tipoVehiculo: true,
        proyectoId: true,
        proyecto: { select: { nombre: true } },
      },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.checklist.findMany({
      where: {
        tipo: "DIARIO",
        fecha: { gte: inicioHoy },
        ...(proyectosPermitidos !== null ? { unidad: filtroProyecto } : {}),
      },
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
        evidencia: { select: { url: true } },
        capturadoPor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    }),
    prisma.checklist.findMany({
      where: {
        tipo: "SEMANAL",
        fecha: { gte: inicioHoy },
        ...(proyectosPermitidos !== null ? { unidad: filtroProyecto } : {}),
      },
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
        capturadoPor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    }),
    prisma.unidad.findMany({
      where: { estatus: "ACTIVO", checklists: { none: { tipo: "DIARIO", fecha: { gte: inicioHoy } } }, ...filtroProyecto },
      select: { numeroEconomico: true },
    }),
  ]);

  const unidadesWizard = unidades.map((u) => ({
    numeroEconomico: u.numeroEconomico,
    marca: u.marca,
    unidadModelo: u.unidadModelo,
    tipoVehiculo: u.tipoVehiculo,
    proyectoId: u.proyectoId,
    proyectoNombre: u.proyecto?.nombre ?? null,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" style={{ maxWidth: 960 }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: "var(--font)",
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              color: "var(--sidebar-text-active)",
            }}
          >
            Checklist
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Inspección diaria y semanal de unidades.
          </p>
        </div>
        <Link
          href="/checklist/historial"
          className="flex items-center gap-2 rounded-md px-4 h-10"
          style={{
            background: "var(--panel-bg)",
            color: "var(--sidebar-text-active)",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-base)",
          }}
        >
          <CalendarDays size={16} /> Historial por fecha
        </Link>
      </div>

      <ChecklistEntrada
        unidades={unidadesWizard}
        proyectos={proyectos}
        esAdmin={esAdmin}
        fechaHoraActual={fechaHoraActual}
      />

      {sinCapturaHoy.length > 0 && (
        <div
          className="rounded-md px-4 py-3"
          style={{
            background: "var(--status-revision-bg)",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-sm)",
            color: "var(--color-status-revision)",
          }}
        >
          {sinCapturaHoy.length} unidad(es) activa(s) sin checklist diario hoy:{" "}
          {sinCapturaHoy.map((u) => u.numeroEconomico).join(", ")}
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div>
          <h3
            className="mb-3"
            style={{
              fontFamily: "var(--font)",
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--sidebar-text-active)",
            }}
          >
            Checklists diarios de hoy ({checklistsDiarios.length})
          </h3>
          <ChecklistLista checklists={JSON.parse(JSON.stringify(checklistsDiarios))} />
        </div>

        <div>
          <h3
            className="mb-3"
            style={{
              fontFamily: "var(--font)",
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--sidebar-text-active)",
            }}
          >
            Checklists semanales de hoy ({checklistsSemanales.length})
          </h3>
          <ChecklistSemanalLista checklists={JSON.parse(JSON.stringify(checklistsSemanales))} />
        </div>
      </div>
    </div>
  );
}
