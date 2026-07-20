"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function crearReporteProgramado(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const campos = formData.getAll("campos").map(String);
  const destinatarios = String(formData.get("destinatarios") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  const hora = String(formData.get("hora") ?? "08:00");
  const frecuencia = String(formData.get("frecuencia") ?? "SEMANAL");

  if (!nombre || !tipo || campos.length === 0 || destinatarios.length === 0) {
    throw new Error("Nombre, tipo, al menos un campo y un destinatario son obligatorios.");
  }

  const session = await auth();
  if (!session?.user?.id) throw new Error("Sesión no válida.");

  await prisma.reporteProgramado.create({
    data: {
      nombre,
      tipo,
      camposJson: campos,
      filtrosJson: {},
      destinatarios,
      hora,
      frecuencia: frecuencia as never,
      creadoPorId: session.user.id,
    },
  });

  revalidatePath("/reportes");
}

export async function alternarReporte(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "true") === "true";
  await prisma.reporteProgramado.update({ where: { id }, data: { activo: !activo } });
  revalidatePath("/reportes");
}
