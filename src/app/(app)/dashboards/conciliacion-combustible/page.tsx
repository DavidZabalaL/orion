import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { leerFiltrosGasto, type SearchParamsFiltros } from "@/lib/filtros-gasto";
import { parseFechaLocalMx, finDelDiaMx } from "@/lib/timezone";
import { FiltrosGasto } from "@/components/ui/filtros-gasto";
import { conciliarCargas } from "@/lib/conciliacion-combustible";
import { ConciliacionCombustibleTabla } from "@/components/dashboard/conciliacion-combustible-tabla";
import type { TipoVehiculo } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const DIA_MS = 86_400_000;
const isoDia = (d: Date) => new Date(d.getTime() - 6 * 3_600_000).toISOString().slice(0, 10);
const numero = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return String(v ?? "").trim() && Number.isFinite(n) ? n : null;
};

export default async function ConciliacionCombustiblePage({ searchParams }: { searchParams: Promise<SearchParamsFiltros> }) {
  await requerirPermisoModulo("M");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("M");
  const filtros = leerFiltrosGasto(await searchParams);

  const [primerChecklist, ultimaImportada, proyectos] = await Promise.all([
    prisma.checklist.findFirst({ where: { tipo: "CARGA_COMBUSTIBLE" }, orderBy: { fecha: "asc" }, select: { fecha: true } }),
    prisma.combustible.findFirst({ where: { fuente: "ARCHIVO", numeroEconomico: { not: null } }, orderBy: { fecha: "desc" }, select: { fecha: true } }),
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  // Por defecto los últimos 30 días; nunca antes de que existiera el checklist de carga
  // (si no, toda transacción previa saldría como "sin checklist").
  const hoy = new Date();
  const desdeTexto = filtros.desde || isoDia(new Date(hoy.getTime() - 30 * DIA_MS));
  const hastaTexto = filtros.hasta || isoDia(hoy);
  const inicioPrograma = primerChecklist?.fecha ?? hoy;
  const inicio = new Date(Math.max(parseFechaLocalMx(desdeTexto)!.getTime(), inicioPrograma.getTime()));
  const fin = finDelDiaMx(hastaTexto)!;
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

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/dashboards" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Dashboards
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Conciliación de cargas de combustible
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Cruza cada checklist de carga con la transacción real (misma unidad, mismo día ± 1). Litros e importe deben coincidir exactamente.
          Transacciones importadas hasta el <strong>{ultimaImportada ? isoDia(ultimaImportada.fecha) : "—"}</strong>; los checklists posteriores quedan pendientes.
        </p>
      </div>

      <FiltrosGasto filtros={{ ...filtros, desde: desdeTexto, hasta: hastaTexto }} proyectos={proyectos} placeholderBusqueda="Número económico…" />

      <ConciliacionCombustibleTabla filas={JSON.parse(JSON.stringify(filas))} />
    </div>
  );
}
