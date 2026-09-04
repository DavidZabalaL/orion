"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";
import { parsearWorkbook } from "@/lib/excel-parse";

export type ResultadoActualizarPadron = { ok: boolean; error?: string; total?: number; omitidas?: number };

const COLUMNAS = {
  nombreCompleto: ["NOMBRE COMPLETO"],
  empresa: ["EMPRESA"],
  lugarDeTrabajo: ["LUGAR DE TRABAJO"],
  curp: ["CURP"],
  rfc: ["RFC"],
  nss: ["NSS"],
  telefono: ["TELEFONO", "TELÉFONO"],
} as const;

function indiceDe(headers: string[], nombres: readonly string[]): number {
  const limpios = headers.map((h) => h.trim().toUpperCase());
  for (const nombre of nombres) {
    const idx = limpios.indexOf(nombre);
    if (idx >= 0) return idx;
  }
  return -1;
}

export async function actualizarPadronPersonal(formData: FormData): Promise<ResultadoActualizarPadron> {
  await exigirPermisoModulo("K", "editar");

  const parseo = await parsearWorkbook(formData);
  if (!parseo.ok) return { ok: false, error: parseo.error };

  const hoja = parseo.hojas[0];
  const idx = {
    nombreCompleto: indiceDe(hoja.headers, COLUMNAS.nombreCompleto),
    empresa: indiceDe(hoja.headers, COLUMNAS.empresa),
    lugarDeTrabajo: indiceDe(hoja.headers, COLUMNAS.lugarDeTrabajo),
    curp: indiceDe(hoja.headers, COLUMNAS.curp),
    rfc: indiceDe(hoja.headers, COLUMNAS.rfc),
    nss: indiceDe(hoja.headers, COLUMNAS.nss),
    telefono: indiceDe(hoja.headers, COLUMNAS.telefono),
  };

  if (idx.nombreCompleto < 0 || idx.curp < 0) {
    return { ok: false, error: `El archivo debe traer las columnas "NOMBRE COMPLETO" y "CURP". Columnas encontradas: ${hoja.headers.join(", ")}.` };
  }

  const registros: { nombreCompleto: string; empresa: string; lugarDeTrabajo: string; curp: string; rfc: string | null; nss: string | null; telefono: string | null }[] = [];
  const curpsVistos = new Set<string>();
  let omitidas = 0;

  for (const fila of hoja.filas) {
    const nombreCompleto = (fila[idx.nombreCompleto] ?? "").trim().toUpperCase();
    const curp = (fila[idx.curp] ?? "").trim().toUpperCase();
    if (!nombreCompleto || !curp || curpsVistos.has(curp)) {
      if (nombreCompleto || curp) omitidas++;
      continue;
    }
    curpsVistos.add(curp);
    registros.push({
      nombreCompleto,
      empresa: idx.empresa >= 0 ? (fila[idx.empresa] ?? "").trim() : "",
      lugarDeTrabajo: idx.lugarDeTrabajo >= 0 ? (fila[idx.lugarDeTrabajo] ?? "").trim() : "",
      curp,
      rfc: idx.rfc >= 0 ? (fila[idx.rfc] ?? "").trim().toUpperCase() || null : null,
      nss: idx.nss >= 0 ? (fila[idx.nss] ?? "").trim() || null : null,
      telefono: idx.telefono >= 0 ? (fila[idx.telefono] ?? "").trim() || null : null,
    });
  }

  if (registros.length === 0) {
    return { ok: false, error: "No se encontró ningún registro válido (con nombre y CURP) en el archivo." };
  }

  // Reemplazo completo: este padrón es una foto del personal activo al
  // momento de subir el archivo, no un histórico acumulable.
  await prisma.$transaction([
    prisma.personalActivo.deleteMany({}),
    prisma.personalActivo.createMany({ data: registros }),
  ]);

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "update",
      entidad: "PersonalActivo",
      detalle: { total: registros.length, omitidas },
    });
  }

  revalidatePath("/usuarios/padron");
  return { ok: true, total: registros.length, omitidas };
}
