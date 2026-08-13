"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { puedeEditarCapacidadTanque, tienePermisoModulo, exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";

export type ResultadoActualizarCapacidad = { ok: boolean; error?: string };

export async function actualizarCapacidadTanque(formData: FormData): Promise<ResultadoActualizarCapacidad> {
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const capacidadTanqueLitros = parseFloat(String(formData.get("capacidadTanqueLitros") ?? ""));

  if (!(await puedeEditarCapacidadTanque())) {
    return { ok: false, error: "No tienes permiso para editar la capacidad de tanque." };
  }
  if (!numeroEconomico || !capacidadTanqueLitros || capacidadTanqueLitros <= 0) {
    return { ok: false, error: "Captura una capacidad válida, mayor a 0." };
  }

  await prisma.unidad.update({ where: { numeroEconomico }, data: { capacidadTanqueLitros } });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "vehiculos",
      accion: "update",
      entidad: "Unidad",
      entidadId: numeroEconomico,
      detalle: { campo: "capacidadTanqueLitros", nuevo: capacidadTanqueLitros },
    });
  }

  revalidatePath(`/unidades/${numeroEconomico}`);
  invalidarCacheBI(["unidades"]);
  return { ok: true };
}

export type ResultadoSimple = { ok: boolean; error?: string };

export async function reasignarProyecto(formData: FormData): Promise<ResultadoSimple> {
  if (!(await tienePermisoModulo("A", "editar"))) return { ok: false, error: "No tienes permiso para realizar esta acción." };

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const proyectoId = String(formData.get("proyectoId") ?? "") || null;
  if (!numeroEconomico) return { ok: false, error: "Falta el número económico." };

  const anterior = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
  if (!anterior) return { ok: false, error: "La unidad no existe." };

  const permitidos = await proyectosPermitidosParaModulo("A");
  if (permitidos !== null) {
    if (!anterior.proyectoId || !permitidos.includes(anterior.proyectoId)) return { ok: false, error: "No tienes permiso para realizar esta acción." };
    if (proyectoId && !permitidos.includes(proyectoId)) return { ok: false, error: "No tienes permiso para asignar ese proyecto." };
  }

  const ahora = new Date();

  // Actualizar proyectoId en la unidad
  await prisma.unidad.update({ where: { numeroEconomico }, data: { proyectoId } });

  // Cerrar el registro histórico abierto del proyecto anterior
  if (anterior.proyectoId) {
    await prisma.unidadHistoricoProyecto.updateMany({
      where: { numeroEconomico, fechaFin: null },
      data: { fechaFin: ahora },
    });
  }

  // Abrir nuevo registro histórico para el proyecto nuevo
  if (proyectoId) {
    await prisma.unidadHistoricoProyecto.create({
      data: { numeroEconomico, proyectoId, fechaInicio: ahora },
    });
  }

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Unidad",
        entidadId: numeroEconomico,
        usuarioId: session.user.id,
        accion: "EDITAR",
        valoresAnteriores: { proyectoId: anterior?.proyectoId ?? null },
        valoresNuevos: { proyectoId },
      },
    });
    await logActivity({
      userId: session.user.id,
      modulo: "vehiculos",
      accion: "update",
      entidad: "Unidad",
      entidadId: numeroEconomico,
      detalle: { campo: "proyectoId", anterior: anterior?.proyectoId ?? null, nuevo: proyectoId },
    });
  }

  revalidatePath(`/unidades/${numeroEconomico}`);
  revalidatePath("/unidades");
  invalidarCacheBI(["unidades"]);
  return { ok: true };
}

/**
 * Botón de encendido/apagado del listado y la ficha: alterna `disponibilidad`
 * y marca `fechaCambioDisponibilidad` — de ahí cuenta "días sin operar" mientras
 * la unidad permanezca apagada (ver src/lib/actividad-unidad.ts).
 */
export async function alternarDisponibilidad(formData: FormData): Promise<ResultadoSimple> {
  if (!(await tienePermisoModulo("A", "editar"))) return { ok: false, error: "No tienes permiso para realizar esta acción." };

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const disponibilidad = String(formData.get("disponibilidad") ?? "") === "true";
  if (!numeroEconomico) return { ok: false, error: "Falta el número económico." };

  const anterior = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { disponibilidad: true, estatus: true, proyectoId: true } });
  if (!anterior) return { ok: false, error: "La unidad no existe." };
  if (anterior.estatus === "BAJA") return { ok: false, error: "Una unidad dada de baja no se puede encender ni apagar." };

  const permitidos = await proyectosPermitidosParaModulo("A");
  if (permitidos !== null && (!anterior.proyectoId || !permitidos.includes(anterior.proyectoId))) {
    return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }

  const ahora = new Date();
  await prisma.unidad.update({ where: { numeroEconomico }, data: { disponibilidad, fechaCambioDisponibilidad: ahora } });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Unidad",
        entidadId: numeroEconomico,
        usuarioId: session.user.id,
        accion: "EDITAR",
        valoresAnteriores: { disponibilidad: anterior.disponibilidad },
        valoresNuevos: { disponibilidad },
      },
    });
    await logActivity({
      userId: session.user.id,
      modulo: "vehiculos",
      accion: disponibilidad ? "encender" : "apagar",
      entidad: "Unidad",
      entidadId: numeroEconomico,
      detalle: { disponibilidadAnterior: anterior.disponibilidad, disponibilidadNueva: disponibilidad },
    });
  }

  revalidatePath(`/unidades/${numeroEconomico}`);
  revalidatePath("/unidades");
  invalidarCacheBI(["unidades"]);
  return { ok: true };
}

export async function actualizarUnidad(formData: FormData) {
  await exigirPermisoModulo("A", "editar");

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  if (!numeroEconomico) throw new Error("Falta el número económico.");

  const placas = String(formData.get("placas") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const marca = String(formData.get("marca") ?? "").trim();
  const unidadModelo = String(formData.get("unidadModelo") ?? "").trim();
  const anio = parseInt(String(formData.get("anio") ?? ""), 10);
  const tipoVehiculo = String(formData.get("tipoVehiculo") ?? "");
  const tipoCombustible = String(formData.get("tipoCombustible") ?? "");
  const rendimientoPromedio = formData.get("rendimientoPromedio") ? parseFloat(String(formData.get("rendimientoPromedio"))) : null;
  const capacidadTanqueLitros = formData.get("capacidadTanqueLitros") ? parseFloat(String(formData.get("capacidadTanqueLitros"))) : null;
  const proyectoId = String(formData.get("proyectoId") ?? "") || null;
  const resguardanteId = String(formData.get("resguardanteId") ?? "") || null;
  const propietario = String(formData.get("propietario") ?? "");
  const origenPlaca = String(formData.get("origenPlaca") ?? "").trim();
  const tagIave = String(formData.get("tagIave") ?? "").trim() || null;
  const numeroTarjetaCombustible = String(formData.get("numeroTarjetaCombustible") ?? "").trim() || null;
  const licenciaRequerida = String(formData.get("licenciaRequerida") ?? "") || null;

  if (!placas || !marca || !unidadModelo || !anio || !tipoVehiculo || !tipoCombustible || !propietario || !origenPlaca) {
    throw new Error("Faltan campos obligatorios.");
  }

  const dupPlacas = await prisma.unidad.findFirst({ where: { placas, NOT: { numeroEconomico } } });
  if (dupPlacas) throw new Error(`Las placas ${placas} ya están registradas en otra unidad.`);

  const anterior = await prisma.unidad.findUnique({ where: { numeroEconomico } });
  if (!anterior) throw new Error("La unidad no existe.");

  const permitidos = await proyectosPermitidosParaModulo("A");
  if (permitidos !== null) {
    if (!anterior.proyectoId || !permitidos.includes(anterior.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
    if (proyectoId && !permitidos.includes(proyectoId)) throw new Error("No tienes permiso para asignar ese proyecto.");
  }

  if (resguardanteId) {
    const op = await prisma.operador.findUnique({
      where: { id: resguardanteId },
      select: { nombre: true, tipoLicenciaManejo: true } as never,
    }) as { nombre: string; tipoLicenciaManejo: string | null } | null;

    // Operador Tipo A no puede manejar unidades que requieren Tipo B (grúas)
    const licReq = licenciaRequerida ?? (tipoVehiculo === "GRUA" ? "TIPO_B" : "TIPO_A");
    if (op?.tipoLicenciaManejo === "TIPO_A" && licReq === "TIPO_B") {
      throw new Error(`El operador ${op?.nombre ?? ""} tiene licencia Tipo A y no puede ser asignado a una unidad que requiere Tipo B.`);
    }
  }

  const ahoraActualizar = new Date();

  await prisma.unidad.update({
    where: { numeroEconomico },
    data: {
      placas,
      marca,
      unidadModelo,
      anio,
      tipoVehiculo: tipoVehiculo as never,
      tipoCombustible: tipoCombustible as never,
      rendimientoPromedio,
      capacidadTanqueLitros,
      proyectoId,
      resguardanteId,
      propietario: propietario as never,
      origenPlaca,
      tagIave,
      numeroTarjetaCombustible,
      licenciaRequerida: licenciaRequerida as "TIPO_A" | "TIPO_B" | null,
    },
  });

  if (anterior.proyectoId !== proyectoId) {
    if (anterior.proyectoId) {
      await prisma.unidadHistoricoProyecto.updateMany({
        where: { numeroEconomico, fechaFin: null },
        data: { fechaFin: ahoraActualizar },
      });
    }
    if (proyectoId) {
      await prisma.unidadHistoricoProyecto.create({
        data: { numeroEconomico, proyectoId, fechaInicio: ahoraActualizar },
      });
    }
  }

  if (anterior.placas !== placas) {
    await prisma.placa.updateMany({
      where: { numeroEconomico, fechaHasta: null },
      data: { fechaHasta: new Date() },
    });
    await prisma.placa.create({ data: { numeroEconomico, placa: placas, motivo: "Actualización de placas" } });
  }

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Unidad",
        entidadId: numeroEconomico,
        usuarioId: session.user.id,
        accion: "EDITAR",
        valoresAnteriores: anterior ? { placas: anterior.placas, marca: anterior.marca, proyectoId: anterior.proyectoId } : undefined,
        valoresNuevos: { placas, marca, proyectoId },
      },
    });
    await logActivity({
      userId: session.user.id,
      modulo: "vehiculos",
      accion: "update",
      entidad: "Unidad",
      entidadId: numeroEconomico,
      detalle: { anterior: { placas: anterior.placas, marca: anterior.marca, proyectoId: anterior.proyectoId }, nuevo: { placas, marca, proyectoId } },
    });
  }

  revalidatePath(`/unidades/${numeroEconomico}`);
  revalidatePath("/unidades");
  invalidarCacheBI(["unidades"]);
  redirect(`/unidades/${numeroEconomico}`);
}
