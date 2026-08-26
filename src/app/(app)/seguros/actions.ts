"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo, puedeEditarPolizaCompletaSeguro } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { crearDocumento } from "@/lib/subir-archivo";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { parseFechaLocalMx } from "@/lib/timezone";

type CoberturaInput = { tipoCobertura: string; sumaAsegurada: string; deducible: string };

export type ResultadoCrearSeguro = { ok: boolean; error?: string; id?: string };

export async function crearSeguro(formData: FormData): Promise<ResultadoCrearSeguro> {
  try {
    await exigirPermisoModulo("F", "editar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const aseguradora = String(formData.get("aseguradora") ?? "").trim();
  const numeroPoliza = String(formData.get("numeroPoliza") ?? "").trim();
  const fechaInicio = String(formData.get("fechaInicio") ?? "");
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "");
  const costo = parseFloat(String(formData.get("costo") ?? "0"));
  const archivo = formData.get("archivo");

  if (!numeroEconomico || !aseguradora || !numeroPoliza || !fechaInicio || !fechaVencimiento) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Debes adjuntar el PDF de la póliza." };
  }
  if (archivo.type !== "application/pdf") {
    return { ok: false, error: "El archivo debe ser un PDF." };
  }

  const permitidos = await proyectosPermitidosParaModulo("F");
  if (permitidos !== null) {
    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    if (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId)) return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }

  const diasParaVencer = (parseFechaLocalMx(fechaVencimiento)!.getTime() - Date.now()) / 86_400_000;
  const estatus = diasParaVencer < 0 ? "VENCIDO" : diasParaVencer <= 30 ? "POR_VENCER" : "VIGENTE";

  const seguro = await prisma.seguro.create({
    data: {
      numeroEconomico,
      aseguradora,
      numeroPoliza,
      fechaInicio: parseFechaLocalMx(fechaInicio)!,
      fechaVencimiento: parseFechaLocalMx(fechaVencimiento)!,
      costo,
      estatus,
    },
  });

  const documento = await crearDocumento(archivo, {
    carpeta: "polizas",
    entidadRelacionada: "Seguro",
    entidadId: seguro.id,
    tipo: "poliza",
  });
  await prisma.seguro.update({ where: { id: seguro.id }, data: { documentoId: documento.id } });

  const sesionCrear = await auth();
  if (sesionCrear?.user?.id) {
    await logActivity({
      userId: sesionCrear.user.id,
      modulo: "seguros",
      accion: "create",
      entidad: "Seguro",
      entidadId: seguro.id,
      detalle: { numeroEconomico, aseguradora, numeroPoliza, costo },
    });
  }

  revalidatePath("/seguros");
  revalidatePath(`/unidades/${numeroEconomico}`);
  invalidarCacheBI(["seguros"]);
  return { ok: true, id: seguro.id };
}

export async function renovarSeguro(formData: FormData) {
  await exigirPermisoModulo("F", "editar");

  const id = String(formData.get("id") ?? "");
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "");
  const costo = formData.get("costo") ? parseFloat(String(formData.get("costo"))) : undefined;

  if (!fechaVencimiento) throw new Error("La nueva fecha de vencimiento es obligatoria.");

  const permitidos = await proyectosPermitidosParaModulo("F");
  if (permitidos !== null) {
    const actual = await prisma.seguro.findUnique({ where: { id }, select: { unidad: { select: { proyectoId: true } } } });
    if (!actual?.unidad.proyectoId || !permitidos.includes(actual.unidad.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
  }

  const diasParaVencer = (parseFechaLocalMx(fechaVencimiento)!.getTime() - Date.now()) / 86_400_000;
  const estatus = diasParaVencer < 0 ? "VENCIDO" : diasParaVencer <= 30 ? "POR_VENCER" : "VIGENTE";

  const seguro = await prisma.seguro.update({
    where: { id },
    data: { fechaVencimiento: parseFechaLocalMx(fechaVencimiento)!, costo, estatus },
  });

  const sesionRenovar = await auth();
  if (sesionRenovar?.user?.id) {
    await logActivity({
      userId: sesionRenovar.user.id,
      modulo: "seguros",
      accion: "update",
      entidad: "Seguro",
      entidadId: id,
      detalle: { fechaVencimiento, costo, estatus },
    });
  }

  revalidatePath(`/seguros/${id}`);
  revalidatePath("/seguros");
  revalidatePath(`/unidades/${seguro.numeroEconomico}`);
  invalidarCacheBI(["seguros"]);
}

export type ResultadoEditarSeguro = { ok: boolean; error?: string };

/** Edición completa de los datos de una póliza. Reservada a Administrador y Jurídico: a diferencia
 * de renovarSeguro (que corrige solo vigencia/costo con el permiso normal de módulo), esto permite
 * corregir cualquier campo capturado por error, incluida la aseguradora y el número de póliza. */
export async function editarSeguro(formData: FormData): Promise<ResultadoEditarSeguro> {
  if (!(await puedeEditarPolizaCompletaSeguro())) {
    return { ok: false, error: "No tienes permiso para editar los datos de una póliza." };
  }

  const id = String(formData.get("id") ?? "");
  const aseguradora = String(formData.get("aseguradora") ?? "").trim();
  const numeroPoliza = String(formData.get("numeroPoliza") ?? "").trim();
  const fechaInicio = String(formData.get("fechaInicio") ?? "");
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "");
  const costo = parseFloat(String(formData.get("costo") ?? "0"));
  const coberturasJson = String(formData.get("coberturasJson") ?? "[]");

  if (!id || !aseguradora || !numeroPoliza || !fechaInicio || !fechaVencimiento) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  const anterior = await prisma.seguro.findUnique({ where: { id } });
  if (!anterior) return { ok: false, error: "Póliza no encontrada." };

  let coberturas: CoberturaInput[] = [];
  try {
    coberturas = JSON.parse(coberturasJson);
  } catch {
    coberturas = [];
  }

  const diasParaVencer = (parseFechaLocalMx(fechaVencimiento)!.getTime() - Date.now()) / 86_400_000;
  const estatus = diasParaVencer < 0 ? "VENCIDO" : diasParaVencer <= 30 ? "POR_VENCER" : "VIGENTE";

  await prisma.seguro.update({
    where: { id },
    data: {
      aseguradora,
      numeroPoliza,
      fechaInicio: parseFechaLocalMx(fechaInicio)!,
      fechaVencimiento: parseFechaLocalMx(fechaVencimiento)!,
      costo,
      estatus,
      coberturas: {
        deleteMany: {},
        create: coberturas
          .filter((c) => c.tipoCobertura)
          .map((c) => ({
            tipoCobertura: c.tipoCobertura as never,
            sumaAsegurada: parseFloat(c.sumaAsegurada || "0"),
            deducible: parseFloat(c.deducible || "0"),
          })),
      },
    },
  });

  const sesionEditar = await auth();
  if (sesionEditar?.user?.id) {
    await logActivity({
      userId: sesionEditar.user.id,
      modulo: "seguros",
      accion: "update",
      entidad: "Seguro",
      entidadId: id,
      detalle: {
        antes: {
          aseguradora: anterior.aseguradora,
          numeroPoliza: anterior.numeroPoliza,
          fechaInicio: anterior.fechaInicio.toISOString(),
          fechaVencimiento: anterior.fechaVencimiento.toISOString(),
          costo: Number(anterior.costo),
        },
        despues: { aseguradora, numeroPoliza, fechaInicio, fechaVencimiento, costo },
      },
    });
  }

  revalidatePath(`/seguros/${id}`);
  revalidatePath("/seguros");
  revalidatePath(`/unidades/${anterior.numeroEconomico}`);
  invalidarCacheBI(["seguros"]);
  return { ok: true };
}

export async function subirDocumentoSeguro(formData: FormData) {
  await exigirPermisoModulo("F", "editar");

  const id = String(formData.get("id") ?? "");
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new Error("Selecciona un archivo PDF de la póliza.");
  }
  if (archivo.type !== "application/pdf") {
    throw new Error("El archivo debe ser un PDF.");
  }

  const seguro = await prisma.seguro.findUnique({ where: { id }, select: { unidad: { select: { proyectoId: true } }, numeroEconomico: true } });
  if (!seguro) throw new Error("Póliza no encontrada.");

  const permitidos = await proyectosPermitidosParaModulo("F");
  if (permitidos !== null && (!seguro.unidad.proyectoId || !permitidos.includes(seguro.unidad.proyectoId))) {
    throw new Error("No tienes permiso para realizar esta acción.");
  }

  const documento = await crearDocumento(archivo, {
    carpeta: "polizas",
    entidadRelacionada: "Seguro",
    entidadId: id,
    tipo: "poliza",
  });

  await prisma.seguro.update({ where: { id }, data: { documentoId: documento.id } });

  const sesionDocumento = await auth();
  if (sesionDocumento?.user?.id) {
    await logActivity({
      userId: sesionDocumento.user.id,
      modulo: "seguros",
      accion: "update",
      entidad: "Seguro",
      entidadId: id,
      detalle: { campo: "documentoId", nuevo: documento.id },
    });
  }

  revalidatePath(`/seguros/${id}`);
  revalidatePath(`/unidades/${seguro.numeroEconomico}`);
}
