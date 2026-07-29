"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_APLICA_A_UNIDAD } from "@/lib/categorias-gasto";
import { exigirPermisoModulo } from "@/lib/permisos";

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
  const gasto = await prisma.gastoVehicular.update({ where: { id }, data: { estatus: "REALIZADO" } });
  revalidatePath("/mantenimiento");
  if (gasto.numeroEconomico) revalidatePath(`/unidades/${gasto.numeroEconomico}`);
}
