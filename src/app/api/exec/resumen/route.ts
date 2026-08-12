import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExecKey } from "@/lib/exec-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/exec/resumen — resumen de Control Vehicular para el Dashboard
 * Directivo (app externa). Protegido por API key (ver src/lib/exec-auth.ts),
 * no por el sistema de permisos por rol/proyecto que usan los usuarios
 * logueados en Orión — este endpoint es de solo lectura y sin alcance por
 * proyecto (Dirección ve el consolidado de todas las unidades).
 */
export async function GET(req: NextRequest) {
  try {
    requireExecKey(req);

    const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const en30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [
      unidadesPorEstatus,
      totalUnidadesActivas,
      gastoMantenimiento30d,
      gastosMantenimientoSinPago,
      segurosPorVencer,
      gastoTagMes,
      checklistsUltimos7d,
      huecosGpsAbiertos,
    ] = await Promise.all([
      prisma.unidad.groupBy({ by: ["estatus"], _count: { _all: true } }),
      prisma.unidad.count({ where: { estatus: "ACTIVO" } }),
      prisma.gastoVehicular.aggregate({
        where: { categoria: { in: ["MANTENIMIENTO_PREVENTIVO", "MANTENIMIENTO_CORRECTIVO"] }, fecha: { gte: hace30dias } },
        _sum: { costo: true },
        _count: { _all: true },
      }),
      prisma.gastoVehicular.findMany({
        where: { categoria: { in: ["MANTENIMIENTO_PREVENTIVO", "MANTENIMIENTO_CORRECTIVO"] }, fechaPago: null },
        select: { id: true, numeroEconomico: true, descripcion: true, costo: true, fecha: true },
        orderBy: { fecha: "asc" },
        take: 20,
      }),
      prisma.seguro.findMany({
        where: { fechaVencimiento: { lte: en30dias }, estatus: { in: ["VIGENTE", "POR_VENCER"] } },
        select: { id: true, numeroEconomico: true, aseguradora: true, numeroPoliza: true, fechaVencimiento: true },
        orderBy: { fechaVencimiento: "asc" },
        take: 20,
      }),
      prisma.tag.aggregate({ where: { fecha: { gte: inicioMes } }, _sum: { monto: true }, _count: { _all: true } }),
      prisma.checklist.findMany({
        where: { tipo: "DIARIO", fecha: { gte: hace7dias } },
        select: { numeroEconomico: true, fecha: true },
      }),
      prisma.huecoSenalGPS.findMany({
        where: { timestampFin: null },
        select: { id: true, numeroEconomico: true, timestampInicio: true },
        orderBy: { timestampInicio: "desc" },
        take: 20,
      }),
    ]);

    // % de días-unidad con checklist diario capturado en los últimos 7 días,
    // sobre el universo de unidades activas (mismo criterio que el módulo I —
    // Auditoría diaria usa para medir cumplimiento).
    const diasConChecklistPorUnidad = new Set(checklistsUltimos7d.map((c) => `${c.numeroEconomico}-${c.fecha.toISOString().slice(0, 10)}`)).size;
    const cumplimientoChecklist = totalUnidadesActivas > 0
      ? Math.round((diasConChecklistPorUnidad / (totalUnidadesActivas * 7)) * 1000) / 10
      : 0;

    return NextResponse.json({
      unidades: {
        total_activas: totalUnidadesActivas,
        por_estatus: Object.fromEntries(unidadesPorEstatus.map((u) => [u.estatus, u._count._all])),
      },
      mantenimiento: {
        gasto_30d: gastoMantenimiento30d._sum.costo ?? 0,
        cantidad_30d: gastoMantenimiento30d._count._all,
        pendientes_pago: gastosMantenimientoSinPago.map((g) => ({
          id: g.id, numeroEconomico: g.numeroEconomico, descripcion: g.descripcion, costo: g.costo, fecha: g.fecha,
        })),
      },
      seguros: {
        por_vencer_30d: segurosPorVencer.map((s) => ({
          id: s.id, numeroEconomico: s.numeroEconomico, aseguradora: s.aseguradora,
          poliza: s.numeroPoliza, vencimiento: s.fechaVencimiento,
        })),
      },
      tag: {
        gasto_mes: gastoTagMes._sum.monto ?? 0,
        cruces_mes: gastoTagMes._count._all,
      },
      checklist: {
        cumplimiento_7d_pct: cumplimientoChecklist,
      },
      gps: {
        huecos_abiertos: huecosGpsAbiertos.map((h) => ({
          id: h.id, numeroEconomico: h.numeroEconomico, desde: h.timestampInicio,
        })),
      },
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
