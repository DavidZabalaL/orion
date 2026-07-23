"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function normalizarEconomico(v: string) {
  return v.trim().toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export async function crearUnidad(formData: FormData) {
  const numeroEconomico = normalizarEconomico(String(formData.get("numeroEconomico") ?? ""));
  const placas = String(formData.get("placas") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const numeroSerie = String(formData.get("numeroSerie") ?? "").trim().toUpperCase();
  const marca = String(formData.get("marca") ?? "").trim();
  const unidadModelo = String(formData.get("unidadModelo") ?? "").trim();
  const anio = parseInt(String(formData.get("anio") ?? ""), 10);
  const tipoVehiculo = String(formData.get("tipoVehiculo") ?? "");
  const tipoCombustible = String(formData.get("tipoCombustible") ?? "");
  const rendimientoPromedio = formData.get("rendimientoPromedio") ? parseFloat(String(formData.get("rendimientoPromedio"))) : null;
  const capacidadTanqueLitros = parseFloat(String(formData.get("capacidadTanqueLitros") ?? ""));
  const proyectoId = String(formData.get("proyectoId") ?? "");
  const estadoOperacion = String(formData.get("estadoOperacion") ?? "").trim();
  const resguardanteId = String(formData.get("resguardanteId") ?? "") || null;
  const propietario = String(formData.get("propietario") ?? "");
  const origenPlaca = String(formData.get("origenPlaca") ?? "").trim();
  const tagIave = String(formData.get("tagIave") ?? "").trim() || null;

  if (!numeroEconomico || !placas || numeroSerie.length !== 17 || !marca || !unidadModelo || !anio || !tipoVehiculo || !tipoCombustible || !proyectoId || !estadoOperacion || !propietario || !origenPlaca) {
    throw new Error("Faltan campos obligatorios o el número de serie no tiene 17 caracteres.");
  }
  if (!capacidadTanqueLitros || capacidadTanqueLitros <= 0) {
    throw new Error("La capacidad máxima de tanque es obligatoria y debe ser mayor a 0.");
  }

  const [dupEconomico, dupPlacas, dupSerie] = await Promise.all([
    prisma.unidad.findUnique({ where: { numeroEconomico } }),
    prisma.unidad.findUnique({ where: { placas } }),
    prisma.unidad.findUnique({ where: { numeroSerie } }),
  ]);
  if (dupEconomico) throw new Error(`El número económico ${numeroEconomico} ya existe.`);
  if (dupPlacas) throw new Error(`Las placas ${placas} ya están registradas.`);
  if (dupSerie) throw new Error(`El número de serie ${numeroSerie} ya está registrado.`);

  await prisma.unidad.create({
    data: {
      numeroEconomico,
      placas,
      numeroSerie,
      marca,
      unidadModelo,
      anio,
      tipoVehiculo: tipoVehiculo as never,
      tipoCombustible: tipoCombustible as never,
      rendimientoPromedio,
      capacidadTanqueLitros,
      proyectoId,
      estadoOperacion,
      estatus: "ACTIVO",
      disponibilidad: true,
      resguardanteId,
      propietario: propietario as never,
      origenPlaca,
      tagIave,
    },
  });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Unidad",
        entidadId: numeroEconomico,
        usuarioId: session.user.id,
        accion: "CREAR",
        valoresNuevos: { numeroEconomico, placas, marca, unidadModelo },
      },
    });
  }

  redirect(`/unidades/${numeroEconomico}`);
}
