"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_APLICA_A_UNIDAD, CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import type { GastoRow } from "@/components/mantenimiento/mantenimiento-lista";
import { esRolGlobal, exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { parseFechaLocalMx } from "@/lib/timezone";

export type ResultadoEliminarGasto = { ok: boolean; error?: string };
export type ResultadoCrearGasto = { ok: boolean; error?: string; id?: string };

export async function crearGasto(formData: FormData): Promise<ResultadoCrearGasto> {
  try {
    await exigirPermisoModulo("C", "editar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "").trim() || null;
  const proyectoReportanteId = String(formData.get("proyectoReportanteId") ?? "").trim() || null;
  const categoria = String(formData.get("categoria") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const fecha = String(formData.get("fecha") ?? "");
  const costo = parseFloat(String(formData.get("costo") ?? "0"));
  const kmAlMomento = formData.get("kmAlMomento") ? parseInt(String(formData.get("kmAlMomento")), 10) : null;
  const proveedor = String(formData.get("proveedor") ?? "").trim() || null;
  const sc = String(formData.get("sc") ?? "").trim() || null;
  const odc = String(formData.get("odc") ?? "").trim() || null;
  const estatus = String(formData.get("estatus") ?? "PROGRAMADO");
  const fechaIngresoTaller = String(formData.get("fechaIngresoTaller") ?? "") || null;
  const fechaEstimadaSalida = String(formData.get("fechaEstimadaSalida") ?? "") || null;

  if (!categoria || !fecha || !costo) {
    return { ok: false, error: "Categoría, fecha y costo son obligatorios." };
  }

  const aplicaAUnidad = CATEGORIA_APLICA_A_UNIDAD[categoria] ?? true;
  if (aplicaAUnidad && !numeroEconomico) {
    return { ok: false, error: "Selecciona la unidad." };
  }
  if (!aplicaAUnidad && !proyectoReportanteId) {
    return { ok: false, error: "Selecciona el proyecto." };
  }

  let historicoProyectoId: string | null = null;

  const permitidos = await proyectosPermitidosParaModulo("C");
  if (aplicaAUnidad) {
    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico: numeroEconomico! }, select: { proyectoId: true } });
    if (permitidos !== null && (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId))) {
      return { ok: false, error: "No tienes permiso para realizar esta acción." };
    }

    // El gasto se liga al periodo de proyecto vigente de la unidad (UnidadHistoricoProyecto),
    // no solo a su proyectoId actual — así el historial no cambia de proyecto retroactivamente
    // si la unidad se reasigna después. Si la unidad no tiene un periodo abierto (ej. unidades
    // creadas antes de que esto existiera), se abre uno con su proyecto actual.
    const historicoAbierto = await prisma.unidadHistoricoProyecto.findFirst({
      where: { numeroEconomico: numeroEconomico!, fechaFin: null },
      orderBy: { fechaInicio: "desc" },
    });
    if (historicoAbierto) {
      historicoProyectoId = historicoAbierto.id;
    } else if (unidad?.proyectoId) {
      const creado = await prisma.unidadHistoricoProyecto.create({ data: { numeroEconomico: numeroEconomico!, proyectoId: unidad.proyectoId } });
      historicoProyectoId = creado.id;
    }
  } else if (permitidos !== null && !permitidos.includes(proyectoReportanteId!)) {
    return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }

  const gasto = await prisma.gastoVehicular.create({
    data: {
      numeroEconomico: aplicaAUnidad ? numeroEconomico : null,
      proyectoReportanteId: aplicaAUnidad ? null : proyectoReportanteId,
      historicoProyectoId,
      categoria: categoria as never,
      descripcion,
      fecha: parseFechaLocalMx(fecha)!,
      costo,
      kmAlMomento,
      proveedor,
      sc,
      odc,
      estatus: estatus as never,
      fechaIngresoTaller: parseFechaLocalMx(fechaIngresoTaller),
      fechaEstimadaSalida: parseFechaLocalMx(fechaEstimadaSalida),
    },
  });

  const sesionCrear = await auth();
  if (sesionCrear?.user?.id) {
    await logActivity({
      userId: sesionCrear.user.id,
      modulo: "mantenimiento",
      accion: "create",
      entidad: "GastoVehicular",
      entidadId: gasto.id,
      detalle: { categoria, costo, numeroEconomico, proyectoReportanteId },
    });
  }

  revalidatePath("/mantenimiento");
  invalidarCacheBI(["mantenimiento"]);
  if (aplicaAUnidad && numeroEconomico) revalidatePath(`/unidades/${numeroEconomico}`);
  return { ok: true, id: gasto.id };
}

/**
 * El "Historial reciente" de /mantenimiento solo trae los 30 más recientes (para que la
 * página cargue rápido) — por eso una orden con fecha antigua (ej. capturada tarde, con la
 * fecha real del servicio) puede no aparecer ahí aunque sí exista. Esta búsqueda consulta
 * el historial completo, no solo esos 30.
 */
export async function buscarHistorialGastos(query: string): Promise<GastoRow[]> {
  await exigirPermisoModulo("C", "ver");

  const q = query.trim();
  if (q.length < 2) return [];

  const permitidos = await proyectosPermitidosParaModulo("C");
  const filtroProyecto =
    permitidos !== null
      ? { OR: [{ unidad: { proyectoId: { in: permitidos } } }, { proyectoReportanteId: { in: permitidos } }] }
      : {};

  const categoriasCoincidentes = Object.entries(CATEGORIA_GASTO_LABEL)
    .filter(([, label]) => label.toUpperCase().includes(q.toUpperCase()))
    .map(([categoria]) => categoria);

  const gastos = await prisma.gastoVehicular.findMany({
    where: {
      AND: [
        filtroProyecto,
        {
          OR: [
            { numeroEconomico: { contains: q, mode: "insensitive" } },
            { descripcion: { contains: q, mode: "insensitive" } },
            { proveedor: { contains: q, mode: "insensitive" } },
            ...(categoriasCoincidentes.length ? [{ categoria: { in: categoriasCoincidentes as never } }] : []),
          ],
        },
      ],
    },
    include: { unidad: { select: { numeroEconomico: true } }, proyectoReportante: { select: { nombre: true } } },
    orderBy: { fecha: "desc" },
    take: 100,
  });

  return JSON.parse(JSON.stringify(gastos));
}

export async function marcarRealizado(formData: FormData) {
  await exigirPermisoModulo("C", "aprobar");

  const id = String(formData.get("id") ?? "");

  const permitidos = await proyectosPermitidosParaModulo("C");
  if (permitidos !== null) {
    const actual = await prisma.gastoVehicular.findUnique({
      where: { id },
      select: { proyectoReportanteId: true, unidad: { select: { proyectoId: true } } },
    });
    const proyectoId = actual?.unidad?.proyectoId ?? actual?.proyectoReportanteId ?? null;
    if (!proyectoId || !permitidos.includes(proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
  }

  const gasto = await prisma.gastoVehicular.update({ where: { id }, data: { estatus: "REALIZADO" } });

  const sesionRealizado = await auth();
  if (sesionRealizado?.user?.id) {
    await logActivity({
      userId: sesionRealizado.user.id,
      modulo: "mantenimiento",
      accion: "update",
      entidad: "GastoVehicular",
      entidadId: id,
      detalle: { campo: "estatus", nuevo: "REALIZADO" },
    });
  }

  revalidatePath("/mantenimiento");
  invalidarCacheBI(["mantenimiento"]);
  if (gasto.numeroEconomico) revalidatePath(`/unidades/${gasto.numeroEconomico}`);
}

export async function actualizarGasto(formData: FormData) {
  await exigirPermisoModulo("C", "editar");

  const id = String(formData.get("id") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const costo = parseFloat(String(formData.get("costo") ?? "0"));
  const proveedor = String(formData.get("proveedor") ?? "").trim() || null;
  const servicio = String(formData.get("servicio") ?? "").trim() || null;
  const empresa = String(formData.get("empresa") ?? "").trim() || null;
  const sc = String(formData.get("sc") ?? "").trim() || null;
  const odc = String(formData.get("odc") ?? "").trim() || null;
  const entradaSap = String(formData.get("entradaSap") ?? "").trim() || null;
  const fechaRequisicion = String(formData.get("fechaRequisicion") ?? "") || null;
  const fechaOdc = String(formData.get("fechaOdc") ?? "") || null;
  const fechaFactura = String(formData.get("fechaFactura") ?? "") || null;
  const fechaCxp = String(formData.get("fechaCxp") ?? "") || null;
  const fechaPago = String(formData.get("fechaPago") ?? "") || null;
  const fechaIngresoTaller = String(formData.get("fechaIngresoTaller") ?? "") || null;
  const fechaEstimadaSalida = String(formData.get("fechaEstimadaSalida") ?? "") || null;
  const estatus = String(formData.get("estatus") ?? "");

  if (!costo || !estatus) throw new Error("Costo y estatus son obligatorios.");

  const actual = await prisma.gastoVehicular.findUnique({
    where: { id },
    select: { numeroEconomico: true, proyectoReportanteId: true, unidad: { select: { proyectoId: true } } },
  });
  if (!actual) throw new Error("Orden no encontrada.");

  const permitidos = await proyectosPermitidosParaModulo("C");
  if (permitidos !== null) {
    const proyectoId = actual.unidad?.proyectoId ?? actual.proyectoReportanteId ?? null;
    if (!proyectoId || !permitidos.includes(proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
  }

  await prisma.gastoVehicular.update({
    where: { id },
    data: {
      descripcion,
      costo,
      proveedor,
      servicio,
      empresa,
      sc,
      odc,
      entradaSap,
      fechaRequisicion: parseFechaLocalMx(fechaRequisicion),
      fechaOdc: parseFechaLocalMx(fechaOdc),
      fechaFactura: parseFechaLocalMx(fechaFactura),
      fechaCxp: parseFechaLocalMx(fechaCxp),
      fechaPago: parseFechaLocalMx(fechaPago),
      fechaIngresoTaller: parseFechaLocalMx(fechaIngresoTaller),
      fechaEstimadaSalida: parseFechaLocalMx(fechaEstimadaSalida),
      estatus: estatus as never,
    },
  });

  const sesionActualizar = await auth();
  if (sesionActualizar?.user?.id) {
    await logActivity({
      userId: sesionActualizar.user.id,
      modulo: "mantenimiento",
      accion: "update",
      entidad: "GastoVehicular",
      entidadId: id,
      detalle: { costo, estatus },
    });
  }

  revalidatePath("/mantenimiento");
  invalidarCacheBI(["mantenimiento"]);
  if (actual.numeroEconomico) revalidatePath(`/unidades/${actual.numeroEconomico}`);
}

export async function eliminarGasto(formData: FormData): Promise<ResultadoEliminarGasto> {
  if (!(await esRolGlobal())) {
    return { ok: false, error: "Solo el Administrador puede eliminar órdenes de mantenimiento o gastos." };
  }

  const id = String(formData.get("id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!id) return { ok: false, error: "Orden inválida." };
  if (motivo.length < 5) return { ok: false, error: "Describe la razón de la eliminación (mínimo 5 caracteres)." };

  const gasto = await prisma.gastoVehicular.findUnique({ where: { id } });
  if (!gasto) return { ok: false, error: "Orden no encontrada." };

  await prisma.gastoVehicular.delete({ where: { id } });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "GastoVehicular",
        entidadId: id,
        usuarioId: session.user.id,
        accion: "ELIMINAR",
        valoresAnteriores: JSON.parse(JSON.stringify(gasto)),
        valoresNuevos: { motivo },
      },
    });
    await logActivity({
      userId: session.user.id,
      modulo: "mantenimiento",
      accion: "delete",
      entidad: "GastoVehicular",
      entidadId: id,
      detalle: { motivo, registroEliminado: JSON.parse(JSON.stringify(gasto)) },
    });
  }

  revalidatePath("/mantenimiento");
  invalidarCacheBI(["mantenimiento"]);
  if (gasto.numeroEconomico) revalidatePath(`/unidades/${gasto.numeroEconomico}`);
  return { ok: true };
}
