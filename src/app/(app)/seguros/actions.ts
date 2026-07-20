"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type CoberturaInput = { tipoCobertura: string; sumaAsegurada: string; deducible: string };

export async function crearSeguro(formData: FormData) {
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const aseguradora = String(formData.get("aseguradora") ?? "").trim();
  const numeroPoliza = String(formData.get("numeroPoliza") ?? "").trim();
  const fechaInicio = String(formData.get("fechaInicio") ?? "");
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "");
  const costo = parseFloat(String(formData.get("costo") ?? "0"));
  const coberturasJson = String(formData.get("coberturasJson") ?? "[]");

  if (!numeroEconomico || !aseguradora || !numeroPoliza || !fechaInicio || !fechaVencimiento) {
    throw new Error("Faltan campos obligatorios.");
  }

  let coberturas: CoberturaInput[] = [];
  try {
    coberturas = JSON.parse(coberturasJson);
  } catch {
    coberturas = [];
  }

  const diasParaVencer = (new Date(fechaVencimiento).getTime() - Date.now()) / 86_400_000;
  const estatus = diasParaVencer < 0 ? "VENCIDO" : diasParaVencer <= 30 ? "POR_VENCER" : "VIGENTE";

  const seguro = await prisma.seguro.create({
    data: {
      numeroEconomico,
      aseguradora,
      numeroPoliza,
      fechaInicio: new Date(fechaInicio),
      fechaVencimiento: new Date(fechaVencimiento),
      costo,
      estatus,
      coberturas: {
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

  revalidatePath("/seguros");
  revalidatePath(`/unidades/${numeroEconomico}`);
  redirect(`/seguros/${seguro.id}`);
}

export async function renovarSeguro(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "");
  const costo = formData.get("costo") ? parseFloat(String(formData.get("costo"))) : undefined;

  if (!fechaVencimiento) throw new Error("La nueva fecha de vencimiento es obligatoria.");

  const seguro = await prisma.seguro.update({
    where: { id },
    data: { fechaVencimiento: new Date(fechaVencimiento), costo, estatus: "RENOVADO" },
  });

  revalidatePath(`/seguros/${id}`);
  revalidatePath("/seguros");
  revalidatePath(`/unidades/${seguro.numeroEconomico}`);
}
