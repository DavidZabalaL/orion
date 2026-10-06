import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ChecklistHistorialLista } from "@/components/checklist/checklist-historial-lista";
import { SelectorFiltrosHistorial } from "@/components/checklist/selector-filtros-historial";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { parseFechaLocalMx } from "@/lib/timezone";
import { obtenerPrecioPromedioLitroCargaCombustible } from "@/app/(app)/checklist/actions";
import { VALORES_ALERTA_SEMANAL, todasLasClavesFoto } from "@/lib/checklist-semanal";
import { detectarAlertasCargaCombustible } from "@/lib/checklist-carga-combustible-alertas";
import { tieneAlertaDiario } from "@/lib/checklist-diario";
import type { TipoVehiculo, TipoChecklist } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const LIMITE_EXPORTACION = 5000;
const CLAVES_FOTO_SEMANAL = new Set([...todasLasClavesFoto(), "fotoLicenciaUrl"]);

function rangoDia(fecha: string) {
  const inicio = parseFechaLocalMx(fecha)!;
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { inicio, fin };
}

function tieneAlerta(tipo: TipoChecklist, respuestas: Record<string, string>, puntosInspeccion: Record<string, string> | null, capacidadTanqueLitros: number | null, precioPromedioLitro: number | null): boolean {
  switch (tipo) {
    case "SEMANAL":
      return Object.entries(respuestas).some(([k, v]) => !CLAVES_FOTO_SEMANAL.has(k) && VALORES_ALERTA_SEMANAL.has(v));
    case "CARGA_COMBUSTIBLE":
      return (
        detectarAlertasCargaCombustible({
          porcentajeAntes: respuestas.porcentaje_antes,
          porcentajeDespues: respuestas.porcentaje_despues,
          litrosCargados: respuestas.litros_cargados,
          cantidadPagada: respuestas.cantidad_pagada,
          capacidadTanqueLitros,
          precioPromedioLitro,
        }).length > 0
      );
    case "DIARIO":
      return tieneAlertaDiario(puntosInspeccion, respuestas);
    case "REPORTE_FALLA":
      return true; // un reporte de falla es, por definición, una alerta
    default:
      return false;
  }
}

export default async function HistorialChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; tipo?: string; proyectoId?: string; tipoVehiculo?: string; soloAlertas?: string }>;
}) {
  await requerirPermisoModulo("A.1");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A.1");
  const { desde: desdeParam, hasta: hastaParam, tipo, proyectoId, tipoVehiculo, soloAlertas } = await searchParams;

  const hoy = new Date().toISOString().slice(0, 10);
  const desde = desdeParam ?? hoy;
  const hasta = hastaParam ?? hoy;
  const { inicio } = rangoDia(desde);
  const { fin } = rangoDia(hasta);
  const filtroSoloAlertas = soloAlertas === "1";

  const proyectos = await prisma.proyecto.findMany({
    where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  const [checklistsRaw, precioPromedioLitroCombustible] = await Promise.all([
    prisma.checklist.findMany({
      where: {
        fecha: { gte: inicio, lte: fin },
        ...(tipo ? { tipo: tipo as TipoChecklist } : {}),
        unidad: {
          ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}),
          ...(proyectoId ? { proyectoId } : {}),
          ...(tipoVehiculo ? { tipoVehiculo: tipoVehiculo as TipoVehiculo } : {}),
        },
      },
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true, capacidadTanqueLitros: true } },
        capturadoPor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
      take: LIMITE_EXPORTACION,
    }),
    obtenerPrecioPromedioLitroCargaCombustible(),
  ]);

  const checklists = checklistsRaw
    .map((c) => {
      const respuestas = (c.respuestasSemanal as Record<string, string>) ?? {};
      const puntosInspeccion = (c.puntosInspeccion as Record<string, string>) ?? null;
      const capacidadTanqueLitros = c.unidad.capacidadTanqueLitros ? Number(c.unidad.capacidadTanqueLitros) : null;
      return {
        id: c.id,
        tipo: c.tipo,
        fecha: c.fecha,
        odometro: c.odometro,
        horometro: c.horometro,
        unidad: { numeroEconomico: c.unidad.numeroEconomico, marca: c.unidad.marca, unidadModelo: c.unidad.unidadModelo },
        respuestasSemanal: respuestas,
        puntosInspeccion,
        capturadoPor: c.capturadoPor,
        alerta: tieneAlerta(c.tipo, respuestas, puntosInspeccion, capacidadTanqueLitros, precioPromedioLitroCombustible),
      };
    })
    .filter((c) => !filtroSoloAlertas || c.alerta);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/checklist" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a checklist
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Historial de checklists
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Consulta y exporta a Excel todo lo registrado — diarios, semanales, cargas de combustible y reportes de falla — filtrando por rango de fechas, tipo, proyecto/unidad y alertas.
        </p>
      </div>

      <SelectorFiltrosHistorial desde={desde} hasta={hasta} tipo={tipo ?? ""} proyectoId={proyectoId ?? ""} tipoVehiculo={tipoVehiculo ?? ""} soloAlertas={filtroSoloAlertas} proyectos={proyectos} />

      <ChecklistHistorialLista checklists={JSON.parse(JSON.stringify(checklists))} desde={desde} hasta={hasta} />
    </div>
  );
}
