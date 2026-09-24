import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ChecklistLista } from "@/components/checklist/checklist-lista";
import { ChecklistSemanalLista } from "@/components/checklist/checklist-semanal-lista";
import { ChecklistCargaCombustibleLista } from "@/components/checklist/checklist-carga-combustible-lista";
import { ChecklistReporteFallaLista } from "@/components/checklist/checklist-reporte-falla-lista";
import { ChecklistEntrada } from "@/components/checklist/checklist-entrada";
import { TomadasSinChecklistLista } from "@/components/checklist/tomadas-sin-checklist-lista";
import { requerirPermisoModulo, puedeUsarGaleriaChecklist } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { inicioDeHoyMx as inicioDeHoy } from "@/lib/timezone";
import { resolverIdentidadTurno, mismaIdentidad } from "@/lib/identidad-turno";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import type { TipoVehiculo } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

// Tope defensivo para las listas de "hoy" en esta página — en un día normal
// nunca se acerca, pero evita que la carga inicial de /checklist crezca sin
// límite si algún día la flota o el volumen de checklists diarios es mucho
// mayor (un equipo con poca memoria puede tronar con una carga de página ya
// de por sí pesada, aunque no tenga nada que ver con las fotos).
const LIMITE_CHECKLISTS_HOY = 300;

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ proyectoId?: string; tipoVehiculo?: string }>;
}) {
  await requerirPermisoModulo("A.1");

  const proyectosPermitidos = await proyectosPermitidosParaModulo("A.1");
  const esAdmin = proyectosPermitidos === null;
  const { proyectoId, tipoVehiculo } = await searchParams;

  // Filtro de permisos (siempre) + lo que la persona haya elegido en el
  // selector de arriba (opcional) — se combinan para las listas de abajo, sin
  // afectar a `unidadesWizard` (el checklist se puede capturar para cualquier
  // unidad permitida, filtrar esa lista sería una restricción no pedida).
  const filtroProyecto = proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {};
  const filtroSeleccion = {
    ...(proyectoId ? { proyectoId } : {}),
    ...(tipoVehiculo ? { tipoVehiculo: tipoVehiculo as TipoVehiculo } : {}),
  };
  const filtroListas = { ...filtroProyecto, ...filtroSeleccion };

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
      where: { tipo: "DIARIO", fecha: { gte: inicioHoy }, unidad: filtroListas },
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
        evidencia: { select: { url: true } },
        capturadoPor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
      take: LIMITE_CHECKLISTS_HOY,
    }),
    prisma.checklist.findMany({
      where: { tipo: "SEMANAL", fecha: { gte: inicioHoy }, unidad: filtroListas },
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
        capturadoPor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
      take: LIMITE_CHECKLISTS_HOY,
    }),
    prisma.checklist.findMany({
      where: { tipo: "CARGA_COMBUSTIBLE", fecha: { gte: inicioHoy }, unidad: filtroListas },
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
        capturadoPor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
      take: LIMITE_CHECKLISTS_HOY,
    }),
    prisma.checklist.findMany({
      where: { tipo: "REPORTE_FALLA", fecha: { gte: inicioHoy }, unidad: filtroListas },
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
        capturadoPor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
      take: LIMITE_CHECKLISTS_HOY,
    }),
    prisma.unidad.findMany({
      where: { estatus: { not: "BAJA" }, checklists: { none: { tipo: "DIARIO", fecha: { gte: inicioHoy } } }, ...filtroListas },
      select: { numeroEconomico: true, marca: true, unidadModelo: true, tipoVehiculo: true, proyecto: { select: { nombre: true } } },
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

  // Unidades tomadas (sesión abierta en "Mi Turno") que a esta hora siguen sin
  // checklist diario capturado — intersección entre sinCapturaHoy (ya filtrado
  // por proyecto/tipo elegidos) y responsablePorUnidad (sesiones abiertas).
  const tomadasSinChecklist = sinCapturaHoy
    .filter((u) => responsablePorUnidad.has(u.numeroEconomico))
    .map((u) => ({
      numeroEconomico: u.numeroEconomico,
      marca: u.marca,
      unidadModelo: u.unidadModelo,
      tipoVehiculo: TIPO_VEHICULO_LABEL[u.tipoVehiculo] ?? u.tipoVehiculo,
      proyectoNombre: u.proyecto?.nombre ?? null,
      responsable: responsablePorUnidad.get(u.numeroEconomico)?.nombre ?? null,
    }));

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

      <form className="flex flex-wrap items-end gap-2" data-no-print>
        <div>
          <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", marginBottom: 4 }}>Proyecto</label>
          <select
            name="proyectoId"
            defaultValue={proyectoId ?? ""}
            className="rounded-md px-3"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", marginBottom: 4 }}>Tipo de unidad</label>
          <select
            name="tipoVehiculo"
            defaultValue={tipoVehiculo ?? ""}
            className="rounded-md px-3"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_VEHICULO_LABEL).map(([valor, label]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md px-5 h-9 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Filtrar
        </button>
      </form>

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
            Tomadas sin checklist ({tomadasSinChecklist.length})
          </h3>
          <TomadasSinChecklistLista unidades={tomadasSinChecklist} />
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
