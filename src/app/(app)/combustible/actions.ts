"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function crearCombustible(formData: FormData) {
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const litros = parseFloat(String(formData.get("litros") ?? "0"));
  const costo = parseFloat(String(formData.get("costo") ?? "0"));
  const kmActual = parseInt(String(formData.get("kmActual") ?? "0"), 10);
  const estacion = String(formData.get("estacion") ?? "").trim() || null;

  if (!numeroEconomico || !fecha || !litros || !costo || !kmActual) {
    throw new Error("Faltan campos obligatorios.");
  }

  const anterior = await prisma.combustible.findFirst({
    where: { numeroEconomico, kmActual: { lt: kmActual } },
    orderBy: { kmActual: "desc" },
  });
  const rendimientoCalculado = anterior ? (kmActual - anterior.kmActual) / litros : null;

  await prisma.combustible.create({
    data: {
      numeroEconomico,
      fecha: new Date(fecha),
      litros,
      costo,
      kmActual,
      estacion,
      fuente: "MANUAL",
      rendimientoCalculado,
    },
  });

  revalidatePath("/combustible");
  revalidatePath(`/unidades/${numeroEconomico}`);
}

export async function crearMapeoTarjeta(formData: FormData) {
  const numeroTarjeta = String(formData.get("numeroTarjeta") ?? "").trim();
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const proveedor = String(formData.get("proveedor") ?? "").trim();
  const vigenciaDesde = String(formData.get("vigenciaDesde") ?? "");

  if (!numeroTarjeta || !numeroEconomico || !proveedor || !vigenciaDesde) {
    throw new Error("Todos los campos son obligatorios.");
  }

  await prisma.mapeoTarjetaEconomico.create({
    data: { numeroTarjeta, numeroEconomico, proveedor, vigenciaDesde: new Date(vigenciaDesde) },
  });

  revalidatePath("/combustible/mapeo-tarjetas");
}
