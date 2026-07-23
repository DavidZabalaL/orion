"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ResultadoCrearCombustible = { ok: boolean; error?: string; alertaSobrellenado?: boolean };

export async function crearCombustible(formData: FormData): Promise<ResultadoCrearCombustible> {
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
    select: { capacidadTanqueLitros: true, rendimientoPromedio: true },
  });
  if (!unidad) return { ok: false, error: "La unidad no existe." };
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
      nivelEstimadoDespues,
      alertaSobrellenado,
    },
  });

  revalidatePath("/combustible");
  revalidatePath(`/unidades/${numeroEconomico}`);
  return { ok: true, alertaSobrellenado };
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
