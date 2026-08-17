// Motor de ejecución de reportes programados: dado un ReporteProgramado
// (tipo + campos elegidos), resuelve las filas reales desde Prisma, respetando
// el alcance de proyecto del DUEÑO del reporte (nunca un usuario "sistema" sin
// restricción — ver proyectosPermitidosParaModuloDeUsuario). Comparte código
// entre el cron de Vercel y el botón "Ejecutar ahora" para no duplicar lógica.
import { prisma } from "@/lib/prisma";
import { ESTATUS_UNIDAD_LABEL, ESTATUS_SEGURO_LABEL } from "@/lib/estatus";
import { ESTATUS_DOCUMENTAL_LABEL } from "@/lib/estatus-operador";
import { CATEGORIA_GASTO_LABEL, ESTATUS_GASTO_LABEL } from "@/lib/categorias-gasto";
import { CAMPOS_POR_TIPO } from "@/lib/reportes";

export type FilaReporte = Record<string, string | number>;

const fmtFecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });

async function filasInventario(proyectoIds: string[] | null): Promise<FilaReporte[]> {
  const unidades = await prisma.unidad.findMany({
    where: proyectoIds === null ? undefined : { proyectoId: { in: proyectoIds } },
    select: { numeroEconomico: true, placas: true, proyecto: { select: { nombre: true } }, estatus: true, kmOficial: true },
    orderBy: { numeroEconomico: "asc" },
  });
  return unidades.map((u) => ({
    numeroEconomico: u.numeroEconomico,
    placas: u.placas,
    proyecto: u.proyecto?.nombre ?? "Sin proyecto",
    estatus: ESTATUS_UNIDAD_LABEL[u.estatus] ?? u.estatus,
    kmOficial: u.kmOficial,
  }));
}

async function filasMantenimiento(proyectoIds: string[] | null): Promise<FilaReporte[]> {
  const gastos = await prisma.gastoVehicular.findMany({
    where: proyectoIds === null ? undefined : { proyectoReportanteId: { in: proyectoIds } },
    select: { categoria: true, costo: true, estatus: true, proveedor: true },
    orderBy: { fecha: "desc" },
    take: 500,
  });
  return gastos.map((g) => ({
    categoria: CATEGORIA_GASTO_LABEL[g.categoria] ?? g.categoria,
    costo: Number(g.costo),
    estatus: ESTATUS_GASTO_LABEL[g.estatus] ?? g.estatus,
    proveedor: g.proveedor ?? "Sin proveedor",
  }));
}

async function filasCombustible(proyectoIds: string[] | null): Promise<FilaReporte[]> {
  const registros = await prisma.combustible.findMany({
    where: proyectoIds === null ? undefined : { proyectoReportanteId: { in: proyectoIds } },
    select: { litros: true, costo: true, rendimientoCalculado: true },
    orderBy: { fecha: "desc" },
    take: 500,
  });
  return registros.map((c) => ({
    litros: Number(c.litros),
    costo: Number(c.costo),
    rendimiento: c.rendimientoCalculado !== null ? Number(c.rendimientoCalculado) : 0,
  }));
}

async function filasSeguros(proyectoIds: string[] | null): Promise<FilaReporte[]> {
  const seguros = await prisma.seguro.findMany({
    where: proyectoIds === null ? undefined : { unidad: { proyectoId: { in: proyectoIds } } },
    select: { aseguradora: true, fechaVencimiento: true, estatus: true },
    orderBy: { fechaVencimiento: "asc" },
    take: 500,
  });
  return seguros.map((s) => ({
    aseguradora: s.aseguradora,
    vencimiento: fmtFecha.format(s.fechaVencimiento),
    estatus: ESTATUS_SEGURO_LABEL[s.estatus] ?? s.estatus,
  }));
}

async function filasOperadores(proyectoIds: string[] | null): Promise<FilaReporte[]> {
  const operadores = await prisma.operador.findMany({
    where: proyectoIds === null ? undefined : { proyectoId: { in: proyectoIds } },
    select: { nombre: true, proyecto: { select: { nombre: true } }, estatusDocumental: true },
    orderBy: { nombre: "asc" },
  });
  return operadores.map((o) => ({
    nombre: o.nombre,
    proyecto: o.proyecto?.nombre ?? "Sin proyecto",
    estatusDocumental: ESTATUS_DOCUMENTAL_LABEL[o.estatusDocumental] ?? o.estatusDocumental,
  }));
}

async function filasUbicacionNocturna(proyectoIds: string[] | null): Promise<FilaReporte[]> {
  const unidades = await prisma.unidad.findMany({
    where: proyectoIds === null ? undefined : { proyectoId: { in: proyectoIds } },
    select: {
      numeroEconomico: true,
      posicionesGps: { orderBy: { timestamp: "desc" }, take: 1, select: { lat: true, lng: true, timestamp: true } },
    },
    orderBy: { numeroEconomico: "asc" },
  });
  return unidades
    .filter((u) => u.posicionesGps.length > 0)
    .map((u) => ({
      numeroEconomico: u.numeroEconomico,
      ultimaPosicion: `${Number(u.posicionesGps[0].lat)}, ${Number(u.posicionesGps[0].lng)}`,
      hora: fmtFecha.format(u.posicionesGps[0].timestamp),
    }));
}

const FILAS_POR_TIPO: Record<string, (proyectoIds: string[] | null) => Promise<FilaReporte[]>> = {
  inventario: filasInventario,
  mantenimiento: filasMantenimiento,
  combustible: filasCombustible,
  seguros: filasSeguros,
  operadores: filasOperadores,
  ubicacion_nocturna: filasUbicacionNocturna,
};

/** Filas ya proyectadas SOLO a los `campos` elegidos al configurar el reporte, en el orden declarado en CAMPOS_POR_TIPO. */
export async function resolverFilasReporte(tipo: string, campos: string[], proyectoIds: string[] | null): Promise<{ columnas: { key: string; label: string }[]; filas: FilaReporte[] }> {
  const columnasDisponibles = CAMPOS_POR_TIPO[tipo] ?? [];
  const columnas = columnasDisponibles.filter((c) => campos.includes(c.key));

  const resolver = FILAS_POR_TIPO[tipo];
  if (!resolver) return { columnas, filas: [] };

  const todas = await resolver(proyectoIds);
  const filas = todas.map((fila) => Object.fromEntries(columnas.map((c) => [c.key, fila[c.key] ?? ""])));
  return { columnas, filas };
}
