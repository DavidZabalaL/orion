import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ChecklistLista } from "@/components/checklist/checklist-lista";
import { ChecklistSemanalLista } from "@/components/checklist/checklist-semanal-lista";
import { ChecklistCargaCombustibleLista } from "@/components/checklist/checklist-carga-combustible-lista";
import { ChecklistReporteFallaLista } from "@/components/checklist/checklist-reporte-falla-lista";
import { ChecklistEntrada } from "@/components/checklist/checklist-entrada";
import { requerirPermisoModulo, puedeUsarGaleriaChecklist } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { inicioDeHoyMx as inicioDeHoy } from "@/lib/timezone";
import { resolverIdentidadTurno, mismaIdentidad } from "@/lib/identidad-turno";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  await requerirPermisoModulo("A.1");

  const proyectosPermitidos = await proyectosPermitidosParaModulo("A.1");
  const filtroProyecto = proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {};
  const esAdmin = proyectosPermitidos === null;

  const inicioHoy = inicioDeHoy();
  const fechaHoraActual = new Date().toISOString();

  const [unidades, proyectos, checklistsDiarios, checklistsSemanales, checklistsCombustible, checklistsReporteFalla, sinCapturaHoy] = await Promise.all([
    prisma.unidad.findMany({
      where: { estatus: { not: "BAJA" }, ...filtroProyecto },
      select: {
        numeroEconomico: true,
        placas: true,
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
    prisma.checklist.findMany({
      where: {
        tipo: "CARGA_COMBUSTIBLE",
        fecha: { gte: inicioHoy },
        ...(proyectosPermitidos !== null ? { unidad: filtroProyecto } : {}),
      },
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
        capturadoPor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    }),
    prisma.checklist.findMany({
      where: {
        tipo: "REPORTE_FALLA",
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
      where: { estatus: { not: "BAJA" }, checklists: { none: { tipo: "DIARIO", fecha: { gte: inicioHoy } } }, ...filtroProyecto },
      select: { numeroEconomico: true },
    }),
  ]);

  // De las unidades sin checklist hoy, solo alertar por las que sí se
  // movieron (según GPS) — una unidad que no se movió no tuvo actividad que
  // reportar, así que no debe generar la alerta de "falta checklist".
  const posicionesHoy = sinCapturaHoy.length
    ? await prisma.posicionGPS.findMany({
        where: { numeroEconomico: { in: sinCapturaHoy.map((u) => u.numeroEconomico) }, timestamp: { gte: inicioHoy }, kmValidado: { not: null } },
        select: { numeroEconomico: true, kmValidado: true },
      })
    : [];
  const kmPorUnidad = new Map<string, { min: number; max: number }>();
  for (const p of posicionesHoy) {
    const km = p.kmValidado!;
    const actual = kmPorUnidad.get(p.numeroEconomico);
    if (!actual) kmPorUnidad.set(p.numeroEconomico, { min: km, max: km });
    else {
      actual.min = Math.min(actual.min, km);
      actual.max = Math.max(actual.max, km);
    }
  }
  // Umbral de 1km para no marcar como "se movió" el ruido normal del GPS.
  const UMBRAL_MOVIMIENTO_KM = 1;
  const sinCapturaMovieron = sinCapturaHoy.filter((u) => {
    const rango = kmPorUnidad.get(u.numeroEconomico);
    return rango && rango.max - rango.min >= UMBRAL_MOVIMIENTO_KM;
  });

  // Quién tiene activa cada unidad en "Mi Turno" ahora mismo — se autocompleta
  // como responsable del checklist en vez de un catálogo de personal por área
  // (ver WizardDiario), porque quien hace el checklist es quien tomó la unidad,
  // no un dato administrativo aparte. Solo esa misma persona puede completar
  // su checklist (se revalida server-side en crearChecklist).
  const [sesionesAbiertas, identidadPropia, permitirGaleriaFotos] = await Promise.all([
    prisma.bitacoraUsoUnidad.findMany({
      where: { numeroEconomico: { in: unidades.map((u) => u.numeroEconomico) }, fin: null },
      include: { operador: { select: { nombre: true } }, usuario: { select: { nombre: true } } },
    }),
    resolverIdentidadTurno(),
    puedeUsarGaleriaChecklist(),
  ]);
  const responsablePorUnidad = new Map(
    sesionesAbiertas.map((s) => [
      s.numeroEconomico,
      {
        nombre: s.operador?.nombre ?? s.usuario?.nombre ?? null,
        esUnoMismo: mismaIdentidad(identidadPropia, { operadorId: s.operadorId, usuarioId: s.usuarioId }),
      },
    ])
  );

  const unidadesWizard = unidades.map((u) => {
    const responsable = responsablePorUnidad.get(u.numeroEconomico) ?? null;
    return {
      numeroEconomico: u.numeroEconomico,
      placas: u.placas,
      marca: u.marca,
      unidadModelo: u.unidadModelo,
      tipoVehiculo: u.tipoVehiculo,
      proyectoId: u.proyectoId,
      proyectoNombre: u.proyecto?.nombre ?? null,
      responsableActivo: responsable?.nombre ?? null,
      esResponsableActual: responsable?.esUnoMismo ?? false,
    };
  });

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
        permitirGaleriaFotos={permitirGaleriaFotos}
      />

      {sinCapturaMovieron.length > 0 && (
        <div
          className="rounded-md px-4 py-3"
          style={{
            background: "var(--status-revision-bg)",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-sm)",
            color: "var(--color-status-revision)",
          }}
        >
          {sinCapturaMovieron.length} unidad(es) se movieron hoy (según GPS) sin checklist diario:{" "}
          {sinCapturaMovieron.map((u) => u.numeroEconomico).join(", ")}
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
            Checklists de carga de combustible de hoy ({checklistsCombustible.length})
          </h3>
          <ChecklistCargaCombustibleLista checklists={JSON.parse(JSON.stringify(checklistsCombustible))} />
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
            Reportes de falla de hoy ({checklistsReporteFalla.length})
          </h3>
          <ChecklistReporteFallaLista checklists={JSON.parse(JSON.stringify(checklistsReporteFalla))} />
        </div>
      </div>
    </div>
  );
}
