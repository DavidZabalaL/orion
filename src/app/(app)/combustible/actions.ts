"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { esRolGlobal, tienePermisoModulo, exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { parseFechaLocalMx } from "@/lib/timezone";

export type ResultadoCrearCombustible = { ok: boolean; error?: string; alertaSobrellenado?: boolean };
export type ResultadoEliminarCombustible = { ok: boolean; error?: string };

export async function crearCombustible(formData: FormData): Promise<ResultadoCrearCombustible> {
  if (!(await tienePermisoModulo("D", "editar"))) return { ok: false, error: "No tienes permiso para realizar esta acción." };

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const litros = parseFloat(String(formData.get("litros") ?? "0"));
  const costo = parseFloat(String(formData.get("costo") ?? "0"));
  const kmActual = parseInt(String(formData.get("kmActual") ?? "0"), 10);
  const estacion = String(formData.get("estacion") ?? "").trim() || null;

  if (!numeroEconomico || !fecha || !litros || !costo || !kmActual) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  const unidad = await prisma.unidad.findUnique({
    where: { numeroEconomico },
    select: { capacidadTanqueLitros: true, rendimientoPromedio: true, proyectoId: true },
  });
  if (!unidad) return { ok: false, error: "La unidad no existe." };

  const permitidos = await proyectosPermitidosParaModulo("D");
  if (permitidos !== null && (!unidad.proyectoId || !permitidos.includes(unidad.proyectoId))) {
    return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }
  if (!unidad.capacidadTanqueLitros) {
    return { ok: false, error: "Esta unidad no tiene capacidad de tanque registrada. Captúrala en su ficha antes de registrar cargas." };
  }
  const capacidadTanqueLitros = Number(unidad.capacidadTanqueLitros);

  const anterior = await prisma.combustible.findFirst({
    where: { numeroEconomico, kmActual: { lt: kmActual } },
    orderBy: { kmActual: "desc" },
  });
  const rendimientoCalculado = anterior ? (kmActual - anterior.kmActual) / litros : null;

  const rendimientoPromedio = unidad.rendimientoPromedio ? Number(unidad.rendimientoPromedio) : null;
  const litrosConsumidosEstimados =
    anterior && rendimientoPromedio && kmActual > anterior.kmActual
      ? (kmActual - anterior.kmActual) / rendimientoPromedio
      : 0;
  const nivelAntes = anterior?.nivelEstimadoDespues != null
    ? Math.max(0, Math.min(Number(anterior.nivelEstimadoDespues), capacidadTanqueLitros) - litrosConsumidosEstimados)
    : 0;
  const nivelEstimadoDespues = nivelAntes + litros;
  const alertaSobrellenado = nivelEstimadoDespues > capacidadTanqueLitros;

  const combustible = await prisma.combustible.create({
    data: {
      numeroEconomico,
      fecha: parseFechaLocalMx(fecha)!,
      litros,
      costo,
      kmActual,
      estacion,
      fuente: "MANUAL",
      rendimientoCalculado,
      nivelEstimadoDespues,
      alertaSobrellenado,
    },
  });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "combustible",
      accion: "create",
      entidad: "Combustible",
      entidadId: combustible.id,
      detalle: { numeroEconomico, litros, costo, alertaSobrellenado },
    });
  }

  revalidatePath("/combustible");
  invalidarCacheBI(["combustible"]);
  revalidatePath(`/unidades/${numeroEconomico}`);
  return { ok: true, alertaSobrellenado };
}

export async function crearMapeoTarjeta(formData: FormData) {
  await exigirPermisoModulo("D", "editar");

  const numeroTarjeta = String(formData.get("numeroTarjeta") ?? "").trim();
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const proveedor = String(formData.get("proveedor") ?? "").trim();
  const vigenciaDesde = String(formData.get("vigenciaDesde") ?? "");

  if (!numeroTarjeta || !numeroEconomico || !proveedor || !vigenciaDesde) {
    throw new Error("Todos los campos son obligatorios.");
  }

  const permitidos = await proyectosPermitidosParaModulo("D");
  if (permitidos !== null) {
    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    if (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
  }

  const mapeo = await prisma.mapeoTarjetaEconomico.create({
    data: { numeroTarjeta, numeroEconomico, proveedor, vigenciaDesde: parseFechaLocalMx(vigenciaDesde)! },
  });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "combustible",
      accion: "create",
      entidad: "MapeoTarjetaEconomico",
      entidadId: mapeo.numeroTarjeta,
      detalle: { numeroTarjeta, numeroEconomico, proveedor },
    });
  }

  revalidatePath("/combustible/mapeo-tarjetas");
}

export async function eliminarCombustible(formData: FormData): Promise<ResultadoEliminarCombustible> {
  if (!(await esRolGlobal())) {
    return { ok: false, error: "Solo el Administrador puede eliminar cargas de combustible." };
  }

  const id = String(formData.get("id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!id) return { ok: false, error: "Registro inválido." };
  if (motivo.length < 5) return { ok: false, error: "Describe la razón de la eliminación (mínimo 5 caracteres)." };

  const registro = await prisma.combustible.findUnique({ where: { id } });
  if (!registro) return { ok: false, error: "Registro no encontrado." };

  await prisma.combustible.delete({ where: { id } });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Combustible",
        entidadId: id,
        usuarioId: session.user.id,
        accion: "ELIMINAR",
        valoresAnteriores: JSON.parse(JSON.stringify(registro)),
        valoresNuevos: { motivo },
      },
    });
    await logActivity({
      userId: session.user.id,
      modulo: "combustible",
      accion: "delete",
      entidad: "Combustible",
      entidadId: id,
      detalle: { motivo, registroEliminado: JSON.parse(JSON.stringify(registro)) },
    });
  }

  revalidatePath("/combustible");
  invalidarCacheBI(["combustible"]);
  revalidatePath(`/unidades/${registro.numeroEconomico}`);
  return { ok: true };
}
