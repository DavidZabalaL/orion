import { prisma } from "@/lib/prisma";
import { leerFiltrosGasto, type SearchParamsFiltros } from "@/lib/filtros-gasto";
import { parseFechaLocalMx, finDelDiaMx } from "@/lib/timezone";
import { conciliarCargas } from "@/lib/conciliacion-combustible";
import type { TipoVehiculo } from "@/generated/prisma/enums";

const DIA_MS = 86_400_000;
export const isoDiaMx = (d: Date) => new Date(d.getTime() - 6 * 3_600_000).toISOString().slice(0, 10);
const numero = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return String(v ?? "").trim() && Number.isFinite(n) ? n : null;
};

/** Datos de la vista de conciliación — la usan la página y el envío por correo, para que ambos muestren lo mismo. */
export async function cargarConciliacionCombustible(sp: SearchParamsFiltros, proyectosPermitidos: string[] | null) {
  const filtros = leerFiltrosGasto(sp);
  const [primerChecklist, ultimaImportada] = await Promise.all([
    prisma.checklist.findFirst({ where: { tipo: "CARGA_COMBUSTIBLE" }, orderBy: { fecha: "asc" }, select: { fecha: true } }),
    prisma.combustible.findFirst({ where: { fuente: "ARCHIVO", numeroEconomico: { not: null } }, orderBy: { fecha: "desc" }, select: { fecha: true } }),
  ]);

  // Por defecto los últimos 30 días; nunca antes de que existiera el checklist de carga
  // (si no, toda transacción previa saldría como "sin checklist").
  const hoy = new Date();
  const desde = filtros.desde || isoDiaMx(new Date(hoy.getTime() - 30 * DIA_MS));
  const hasta = filtros.hasta || isoDiaMx(hoy);
  const inicio = new Date(Math.max(parseFechaLocalMx(desde)!.getTime(), (primerChecklist?.fecha ?? hoy).getTime()));
  const fin = finDelDiaMx(hasta)!;
  // ±1 día de margen para emparejar en los bordes del rango; luego se recorta.
  const rango = { gte: new Date(inicio.getTime() - DIA_MS), lte: new Date(fin.getTime() + DIA_MS) };

  const filtroUnidad = {
    ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}),
    ...(filtros.proyectoId ? { proyectoId: filtros.proyectoId } : {}),
    ...(filtros.tipoVehiculo ? { tipoVehiculo: filtros.tipoVehiculo as TipoVehiculo } : {}),
  };
  const filtroEconomico = filtros.q ? { contains: filtros.q, mode: "insensitive" as const } : undefined;

  const [checklists, transacciones] = await Promise.all([
    prisma.checklist.findMany({
      where: { tipo: "CARGA_COMBUSTIBLE", fecha: rango, unidad: filtroUnidad, ...(filtroEconomico ? { numeroEconomico: filtroEconomico } : {}) },
      select: { id: true, numeroEconomico: true, fecha: true, respuestasSemanal: true },
    }),
    prisma.combustible.findMany({
      where: { numeroEconomico: filtroEconomico ?? { not: null }, fecha: rango, unidad: filtroUnidad },
      select: { id: true, numeroEconomico: true, fecha: true, litros: true, costo: true, estacion: true },
    }),
  ]);

  const filas = conciliarCargas(
    checklists.map((c) => {
      const r = (c.respuestasSemanal as Record<string, unknown>) ?? {};
      return { id: c.id, numeroEconomico: c.numeroEconomico, fecha: c.fecha, litros: numero(r.litros_cargados), importe: numero(r.cantidad_pagada) };
    }),
    transacciones.map((t) => ({ id: t.id, numeroEconomico: t.numeroEconomico as string, fecha: t.fecha, litros: Number(t.litros), importe: Number(t.costo), estacion: t.estacion })),
    ultimaImportada?.fecha ?? null
  ).filter((f) => f.fecha >= inicio && f.fecha <= fin);

  return { filas, filtros: { ...filtros, desde, hasta }, ultimaImportada: ultimaImportada?.fecha ?? null };
}
