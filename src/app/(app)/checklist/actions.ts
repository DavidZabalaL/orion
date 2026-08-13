"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PUNTOS_INSPECCION } from "@/lib/checklist";
import { SECCIONES_CHECKLIST_SEMANAL } from "@/lib/checklist-semanal";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { logActivity } from "@/lib/activity";

export async function crearChecklist(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await exigirPermisoModulo("A.1", "editar");

    const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
    const odometro = parseInt(String(formData.get("odometro") ?? ""), 10);
    const horometroRaw = String(formData.get("horometro") ?? "");
    const horometro = horometroRaw ? parseInt(horometroRaw, 10) : null;
    const evidenciaUrl = String(formData.get("evidenciaUrl") ?? "").trim() || null;

    if (!numeroEconomico || !odometro) {
      return { ok: false, error: "Unidad y odómetro son obligatorios." };
    }

    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    const permitidos = await proyectosPermitidosParaModulo("A.1");
    if (permitidos !== null) {
      if (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId))
        return { ok: false, error: "No tienes permiso para realizar esta acción." };
    }

    const puntosInspeccion: Record<string, string> = {};
    for (const p of PUNTOS_INSPECCION) {
      puntosInspeccion[p.key] = String(formData.get(`punto_${p.key}`) ?? "ok");
      const fotoUrl = String(formData.get(`foto_${p.key}`) ?? "").trim();
      if (fotoUrl) puntosInspeccion[`${p.key}_foto`] = fotoUrl;
    }

    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

    let evidenciaId: string | undefined;
    if (evidenciaUrl) {
      const documento = await prisma.documento.create({
        data: { entidadRelacionada: "Checklist", entidadId: numeroEconomico, url: evidenciaUrl, tipo: "evidencia_checklist" },
      });
      evidenciaId = documento.id;
    }

    const checklist = await prisma.checklist.create({
      data: {
        numeroEconomico,
        fecha: new Date(),
        odometro,
        horometro,
        puntosInspeccion,
        evidenciaId,
        capturadoPorId: session.user.id,
      },
    });

    await logActivity({
      userId: session.user.id,
      modulo: "checklist",
      accion: "create",
      entidad: "Checklist",
      entidadId: checklist.id,
      detalle: { numeroEconomico, odometro, horometro },
    });

    revalidatePath("/checklist");
    revalidatePath(`/unidades/${numeroEconomico}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el checklist." };
  }
}

/**
 * Checklist Semanal (59 campos, ver src/lib/checklist-semanal.ts) — a diferencia
 * del Diario, no usa `odometro` ni `puntosInspeccion`: todas las respuestas
 * (incluyendo las URLs de las fotos, ya subidas a Blob por el formulario) se
 * guardan en `respuestasSemanal`, un solo JSON por captura.
 */
export async function crearChecklistSemanal(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await exigirPermisoModulo("A.1", "editar");

    const numeroEconomico = String(formData.get("gen_numero_economico") ?? "");
    const fechaStr = String(formData.get("gen_fecha") ?? "");
    const oficinaSede = String(formData.get("gen_oficina_sede") ?? "").trim();
    const licenciaPermanente = String(formData.get("gen_licencia_permanente") ?? "");
    const fotoLicencia = String(formData.get("gen_foto_licencia") ?? "").trim();
    const odometro = String(formData.get("gen_odometro") ?? "").trim();
    const fotoOdometro = String(formData.get("gen_foto_odometro") ?? "").trim();
    const horometro = String(formData.get("gen_horometro") ?? "").trim();
    const fotoHorometro = String(formData.get("gen_foto_horometro") ?? "").trim();

    if (!numeroEconomico || !fechaStr || !oficinaSede || !fotoLicencia) {
      return { ok: false, error: "Fecha, oficina/sede, número económico y foto de licencia son obligatorios." };
    }
    if (!odometro) {
      return { ok: false, error: "El odómetro es obligatorio." };
    }

    const unidad = await prisma.unidad.findUnique({
      where: { numeroEconomico },
      select: { proyectoId: true, marca: true, unidadModelo: true, tipoVehiculo: true },
    });
    if (!unidad) return { ok: false, error: "La unidad no existe." };

    const permitidos = await proyectosPermitidosParaModulo("A.1");
    if (permitidos !== null && (!unidad.proyectoId || !permitidos.includes(unidad.proyectoId))) {
      return { ok: false, error: "No tienes permiso para realizar esta acción." };
    }

    const respuestas: Record<string, string> = {
      oficinaSede,
      licenciaPermanente,
      fotoLicenciaUrl: fotoLicencia,
      modelo: `${unidad.marca} ${unidad.unidadModelo}`,
      tipoVehiculo: unidad.tipoVehiculo,
    };
    if (odometro) respuestas.gen_odometro = odometro;
    if (fotoOdometro) respuestas.gen_foto_odometro = fotoOdometro;
    if (horometro) respuestas.gen_horometro = horometro;
    if (fotoHorometro) respuestas.gen_foto_horometro = fotoHorometro;

    const camposFaltantes: string[] = [];
    for (const seccion of SECCIONES_CHECKLIST_SEMANAL) {
      for (const campo of seccion.campos) {
        if (campo.tipo === "radio" && campo.soloTipoVehiculo && campo.soloTipoVehiculo !== unidad.tipoVehiculo) continue;

        const valor = String(formData.get(campo.key) ?? "").trim();
        if (campo.requerido && !valor) camposFaltantes.push(campo.label);
        if (valor) respuestas[campo.key] = valor;

        if (campo.tipo === "radio" && campo.fotoKey) {
          const fotoValor = String(formData.get(campo.fotoKey) ?? "").trim();
          if (campo.fotoRequerido && !fotoValor) camposFaltantes.push(campo.fotoLabel ?? campo.fotoKey);
          if (fotoValor) respuestas[campo.fotoKey] = fotoValor;
        }
      }
    }

    if (camposFaltantes.length > 0) {
      return { ok: false, error: `Faltan campos obligatorios: ${camposFaltantes.join(", ")}.` };
    }

    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

    const checklist = await prisma.checklist.create({
      data: {
        numeroEconomico,
        tipo: "SEMANAL",
        fecha: new Date(fechaStr),
        puntosInspeccion: {},
        respuestasSemanal: respuestas,
        capturadoPorId: session.user.id,
      },
    });

    await logActivity({
      userId: session.user.id,
      modulo: "checklist",
      accion: "create",
      entidad: "Checklist",
      entidadId: checklist.id,
      detalle: { numeroEconomico, tipo: "SEMANAL" },
    });

    revalidatePath("/checklist");
    revalidatePath(`/unidades/${numeroEconomico}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el checklist semanal." };
  }
}
