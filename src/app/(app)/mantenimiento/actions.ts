"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function crearGasto(formData: FormData) {
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const fecha = String(formData.get("fecha") ?? "");
  const costo = parseFloat(String(formData.get("costo") ?? "0"));
  const kmAlMomento = formData.get("kmAlMomento") ? parseInt(String(formData.get("kmAlMomento")), 10) : null;
  const proveedor = String(formData.get("proveedor") ?? "").trim() || null;
  const sc = String(formData.get("sc") ?? "").trim() || null;
  const odc = String(formData.get("odc") ?? "").trim() || null;
  const estatus = String(formData.get("estatus") ?? "PROGRAMADO");

  if (!numeroEconomico || !categoria || !fecha || !costo) {
    throw new Error("Unidad, categoría, fecha y costo son obligatorios.");
  }

  await prisma.gastoVehicular.create({
    data: {
      numeroEconomico,
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
  revalidatePath(`/unidades/${numeroEconomico}`);
  redirect("/mantenimiento");
}

export async function marcarRealizado(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const gasto = await prisma.gastoVehicular.update({ where: { id }, data: { estatus: "REALIZADO" } });
  revalidatePath("/mantenimiento");
  revalidatePath(`/unidades/${gasto.numeroEconomico}`);
}
