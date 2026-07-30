"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_APLICA_A_UNIDAD } from "@/lib/categorias-gasto";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export async function crearGasto(formData: FormData) {
  await exigirPermisoModulo("C", "editar");

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

  if (!categoria || !fecha || !costo) {
    throw new Error("Categoría, fecha y costo son obligatorios.");
  }

  const aplicaAUnidad = CATEGORIA_APLICA_A_UNIDAD[categoria] ?? true;
  if (aplicaAUnidad && !numeroEconomico) {
    throw new Error("Selecciona la unidad.");
  }
  if (!aplicaAUnidad && !proyectoReportanteId) {
    throw new Error("Selecciona el proyecto.");
  }

  const permitidos = await proyectosPermitidosParaModulo("C");
  if (permitidos !== null) {
    if (aplicaAUnidad) {
      const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico: numeroEconomico! }, select: { proyectoId: true } });
      if (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
    } else if (!permitidos.includes(proyectoReportanteId!)) {
      throw new Error("No tienes permiso para realizar esta acción.");
    }
  }

  await prisma.gastoVehicular.create({
    data: {
      numeroEconomico: aplicaAUnidad ? numeroEconomico : null,
      proyectoReportanteId: aplicaAUnidad ? null : proyectoReportanteId,
      categoria: categoria as never,
      descripcion,
      fecha: new Date(fecha),
      costo,
      kmAlMomento,
      proveedor,
      sc,
      odc,
      estatus: estatus as never,
    },
  });

  revalidatePath("/mantenimiento");
  if (aplicaAUnidad && numeroEconomico) revalidatePath(`/unidades/${numeroEconomico}`);
  redirect("/mantenimiento");
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
  revalidatePath("/mantenimiento");
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
      fechaRequisicion: fechaRequisicion ? new Date(fechaRequisicion) : null,
      fechaOdc: fechaOdc ? new Date(fechaOdc) : null,
      fechaFactura: fechaFactura ? new Date(fechaFactura) : null,
      fechaCxp: fechaCxp ? new Date(fechaCxp) : null,
      fechaPago: fechaPago ? new Date(fechaPago) : null,
      estatus: estatus as never,
    },
  });

  revalidatePath("/mantenimiento");
  if (actual.numeroEconomico) revalidatePath(`/unidades/${actual.numeroEconomico}`);
}
