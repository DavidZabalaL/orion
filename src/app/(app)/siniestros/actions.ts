"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo } from "@/lib/permisos";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function generarFolio(fecha: string) {
  const anio = fecha.slice(0, 4);
  const random = Math.floor(Math.random() * 900000 + 100000);
  return `SIN-${anio}-${random}`;
}

export async function crearSiniestro(fd: FormData) {
  await exigirPermisoModulo("S", "editar");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Sin sesión");

  const numeroEconomico = fd.get("numeroEconomico") as string;
  const fecha = fd.get("fecha") as string;
  const tipo = fd.get("tipo") as string;
  const descripcion = fd.get("descripcion") as string;

  if (!numeroEconomico || !fecha || !tipo || !descripcion) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }
  if (fecha > hoy()) {
    return { ok: false, error: "La fecha no puede ser futura." };
  }

  const folio = generarFolio(fecha);

  await prisma.siniestro.create({
    data: {
      folio,
      numeroEconomico,
      operadorId: (fd.get("operadorId") as string) || null,
      fecha: new Date(fecha),
      tipo: tipo as never,
      descripcion,
      ubicacion: (fd.get("ubicacion") as string) || null,
      aseguradora: (fd.get("aseguradora") as string) || null,
      noSiniestroAseguradora: (fd.get("noSiniestroAseguradora") as string) || null,
      noReporte: (fd.get("noReporte") as string) || null,
      personasInvolucradas: (fd.get("personasInvolucradas") as string) || null,
      danosTerceros: (fd.get("danosTerceros") as string) || null,
      danosUnidad: (fd.get("danosUnidad") as string) || null,
      estimacionDanos: (fd.get("estimacionDanos") as string) ? Number(fd.get("estimacionDanos")) : null,
      estatus: "ABIERTO",
      reportadoPorId: userId,
    },
  });

  await logActivity({ userId, modulo: "siniestros", accion: "create", entidad: "Siniestro" });
  revalidatePath("/siniestros");
  invalidarCacheBI(["siniestros"]);
  return { ok: true };
}

export async function actualizarEstatusSiniestro(fd: FormData) {
  await exigirPermisoModulo("S", "editar");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Sin sesión");

  const id = fd.get("id") as string;
  const estatus = fd.get("estatus") as string;
  if (!id || !estatus) return { ok: false, error: "Faltan parámetros." };

  await prisma.siniestro.update({
    where: { id },
    data: { estatus: estatus as never, updatedAt: new Date() },
  });

  await logActivity({ userId, modulo: "siniestros", accion: "update", entidad: "Siniestro", entidadId: id, detalle: { estatus } });
  revalidatePath("/siniestros");
  invalidarCacheBI(["siniestros"]);
  return { ok: true };
}

export async function actualizarSiniestro(fd: FormData) {
  await exigirPermisoModulo("S", "editar");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Sin sesión");

  const id = fd.get("id") as string;
  if (!id) return { ok: false, error: "ID requerido." };

  const fecha = fd.get("fecha") as string;
  if (fecha && fecha > hoy()) return { ok: false, error: "La fecha no puede ser futura." };

  await prisma.siniestro.update({
    where: { id },
    data: {
      aseguradora: (fd.get("aseguradora") as string) || null,
      noSiniestroAseguradora: (fd.get("noSiniestroAseguradora") as string) || null,
      noReporte: (fd.get("noReporte") as string) || null,
      personasInvolucradas: (fd.get("personasInvolucradas") as string) || null,
      danosTerceros: (fd.get("danosTerceros") as string) || null,
      danosUnidad: (fd.get("danosUnidad") as string) || null,
      estimacionDanos: (fd.get("estimacionDanos") as string) ? Number(fd.get("estimacionDanos")) : null,
      estatus: (fd.get("estatus") as never) || undefined,
      updatedAt: new Date(),
    },
  });

  await logActivity({ userId, modulo: "siniestros", accion: "update", entidad: "Siniestro", entidadId: id });
  revalidatePath("/siniestros");
  invalidarCacheBI(["siniestros"]);
  return { ok: true };
}
