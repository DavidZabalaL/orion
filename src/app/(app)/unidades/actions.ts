"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { puedeEditarCapacidadTanque, tienePermisoModulo, exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { registrarCambioDisponibilidad } from "@/lib/sla-disponibilidad";
import { registrarCambioResguardante } from "@/lib/resguardo";
import { CLAVE_OCULTAR_SLA_DISPONIBILIDAD } from "@/lib/preferencias-usuario";
import { crearDocumento } from "@/lib/subir-archivo";
import { TIPOS_DOCUMENTO_UNIDAD, REQUIERE_ANIO } from "@/lib/catalogo-documentos-unidad";
import type { TipoDocumentoUnidad, MotivoIndisponibilidad } from "@/generated/prisma/enums";

const MOTIVOS_INDISPONIBILIDAD: MotivoIndisponibilidad[] = ["MANTENIMIENTO", "SINIESTRO", "SIN_OPERADOR", "TRAMITE_DOCUMENTACION", "SIN_COMBUSTIBLE", "OTRO"];

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
  invalidarCacheBI(["unidades", "historico_proyecto"]);
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

  const motivoRaw = String(formData.get("motivo") ?? "");
  const motivo = MOTIVOS_INDISPONIBILIDAD.includes(motivoRaw as MotivoIndisponibilidad) ? (motivoRaw as MotivoIndisponibilidad) : null;
  const motivoDetalle = String(formData.get("motivoDetalle") ?? "").trim().slice(0, 300) || null;
  if (!disponibilidad && !motivo) return { ok: false, error: "Selecciona el motivo por el que la unidad no está disponible." };

  const anterior = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { disponibilidad: true, estatus: true, proyectoId: true } });
  if (!anterior) return { ok: false, error: "La unidad no existe." };
  if (anterior.estatus === "BAJA") return { ok: false, error: "Una unidad dada de baja no se puede encender ni apagar." };

  const permitidos = await proyectosPermitidosParaModulo("A");
  if (permitidos !== null && (!anterior.proyectoId || !permitidos.includes(anterior.proyectoId))) {
    return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }

  const ahora = new Date();
  await prisma.unidad.update({
    where: { numeroEconomico },
    data: {
      disponibilidad,
      fechaCambioDisponibilidad: ahora,
      motivoIndisponibilidad: disponibilidad ? null : motivo,
      motivoIndisponibilidadDetalle: disponibilidad ? null : motivoDetalle,
    },
  });
  await registrarCambioDisponibilidad(numeroEconomico, disponibilidad, ahora, motivo, motivoDetalle);

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
  invalidarCacheBI(["unidades", "historico_proyecto"]);
  return { ok: true };
}

export async function subirDocumentoUnidad(formData: FormData): Promise<ResultadoSimple> {
  if (!(await tienePermisoModulo("A", "editar"))) return { ok: false, error: "No tienes permiso para realizar esta acción." };

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const tipoDocumento = String(formData.get("tipoDocumento") ?? "") as TipoDocumentoUnidad;
  const anioRaw = String(formData.get("anio") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const archivo = formData.get("archivo");

  if (!numeroEconomico) return { ok: false, error: "Falta el número económico." };
  if (!TIPOS_DOCUMENTO_UNIDAD.includes(tipoDocumento)) return { ok: false, error: "Selecciona un concepto de documento válido." };
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: "Debes adjuntar un archivo." };

  let anio: number | null = null;
  if (REQUIERE_ANIO.has(tipoDocumento)) {
    anio = parseInt(anioRaw, 10);
    if (!anio || anio < 2000 || anio > 2100) return { ok: false, error: "Captura un año válido para este concepto." };
  }

  const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
  if (!unidad) return { ok: false, error: "La unidad no existe." };

  const permitidos = await proyectosPermitidosParaModulo("A");
  if (permitidos !== null && (!unidad.proyectoId || !permitidos.includes(unidad.proyectoId))) {
    return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }

  const session = await auth();

  let documento;
  try {
    documento = await crearDocumento(archivo, {
      carpeta: "documentos-unidad",
      entidadRelacionada: "DocumentoUnidad",
      entidadId: numeroEconomico,
      tipo: tipoDocumento,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo subir el archivo." };
  }

  await prisma.documentoUnidad.create({
    data: {
      numeroEconomico,
      tipoDocumento,
      anio,
      descripcion,
      archivoId: documento.id,
      subidoPorId: session?.user?.id,
    },
  });

  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "documentos",
      accion: "create",
      entidad: "DocumentoUnidad",
      entidadId: numeroEconomico,
      detalle: { tipoDocumento, anio },
    });
  }

  revalidatePath(`/unidades/${numeroEconomico}`);
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

  if (anterior.resguardanteId !== resguardanteId) {
    await registrarCambioResguardante(numeroEconomico, resguardanteId, ahoraActualizar, "Reasignación desde edición de unidad");
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

/**
 * Preferencia personal: el usuario en sesión oculta (o vuelve a mostrar) la
 * columna de SLA de disponibilidad para sí mismo — independiente de si su
 * rol tiene el permiso especial "verSlaDisponibilidad" (eso decide si puede
 * verla EN ABSOLUTO; esto solo decide si él, personalmente, quiere verla).
 */
export async function alternarOcultarSlaDisponibilidad(oculto: boolean): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.preferenciaUsuario.upsert({
    where: { usuarioId_clave: { usuarioId: session.user.id, clave: CLAVE_OCULTAR_SLA_DISPONIBILIDAD } },
    create: { usuarioId: session.user.id, clave: CLAVE_OCULTAR_SLA_DISPONIBILIDAD, valor: oculto },
    update: { valor: oculto },
  });
}
