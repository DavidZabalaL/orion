"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PUNTOS_INSPECCION } from "@/lib/checklist";
import { SECCIONES_CHECKLIST_SEMANAL } from "@/lib/checklist-semanal";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { parseFechaLocalMx } from "@/lib/timezone";
import { ESTADOS_CARGA, AREAS_CARGA, TIPOS_COMBUSTIBLE_CARGA } from "@/lib/checklist-carga-combustible";

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const TAMANO_MAX = 20 * 1024 * 1024;

export async function subirFotoChecklist(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await exigirPermisoModulo("A.1", "editar");
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return { ok: false, error: "No se seleccionó ningún archivo." };
    if (file.size > TAMANO_MAX) return { ok: false, error: "La foto excede el límite de 20 MB." };
    if (!TIPOS_IMAGEN.includes(file.type) && !file.type.startsWith("image/")) {
      return { ok: false, error: "Solo se permiten imágenes (JPG, PNG, WEBP, HEIC)." };
    }
    const nombre = `checklist/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const blob = await put(nombre, file, { access: "private", addRandomSuffix: false });
    return { ok: true, url: blob.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo subir la foto." };
  }
}

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

    // El "responsable" del checklist diario se resuelve aquí, en el servidor
    // —nunca se confía en el que mande el navegador— a partir de quien tenga
    // la unidad tomada activamente en "Mi Turno" en este momento.
    const sesionActiva = await prisma.bitacoraUsoUnidad.findFirst({
      where: { numeroEconomico, fin: null },
      include: { operador: { select: { nombre: true } }, usuario: { select: { nombre: true } } },
    });
    const responsable = sesionActiva?.operador?.nombre ?? sesionActiva?.usuario?.nombre ?? null;
    if (!responsable) {
      return { ok: false, error: 'Esta unidad no tiene un responsable activo. Debe tomarse primero desde "Mi Turno".' };
    }

    const puntosInspeccion: Record<string, string> = {};
    for (const p of PUNTOS_INSPECCION) {
      puntosInspeccion[p.key] = String(formData.get(`punto_${p.key}`) ?? "ok");
      const fotoUrl = String(formData.get(`foto_${p.key}`) ?? "").trim();
      if (fotoUrl) puntosInspeccion[`${p.key}_foto`] = fotoUrl;
    }
    const fotoHorometro = String(formData.get("foto_horometro") ?? "").trim();
    if (fotoHorometro) puntosInspeccion["horometro_foto"] = fotoHorometro;

    // Collect extra section fields (generales, niveles, exterior, interior, seguridad)
    const EXTRA_PREFIXES = ["gen_", "niv_", "ext_", "int_", "seg_"];
    const respuestasExtra: Record<string, string> = {};
    for (const [k, v] of formData.entries()) {
      if (EXTRA_PREFIXES.some((pfx) => k.startsWith(pfx))) {
        const val = String(v).trim();
        if (val) respuestasExtra[k] = val;
      }
    }
    // Se sobreescribe con el valor resuelto en el servidor, nunca con lo que haya mandado el navegador.
    respuestasExtra["gen_responsable"] = responsable;

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
        ...(Object.keys(respuestasExtra).length > 0 ? { respuestasSemanal: respuestasExtra } : {}),
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
    invalidarCacheBI(["checklist"]);
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
        fecha: parseFechaLocalMx(fechaStr)!,
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
    invalidarCacheBI(["checklist"]);
    revalidatePath(`/unidades/${numeroEconomico}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el checklist semanal." };
  }
}

/**
 * Checklist de Carga de Combustible — 3 secciones:
 * Generales (fecha, zona, municipio, área, responsable, licencia + foto)
 * Vehículo (tipo, número económico, modelo)
 * Carga (tipo combustible, fotos odómetro antes/después, evidencia bomba x2, ticket, observaciones, firma)
 */
export async function crearChecklistCargaCombustible(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await exigirPermisoModulo("A.1", "editar");

    // Generales
    const fecha = String(formData.get("gen_fecha") ?? "").trim();
    const zona = String(formData.get("gen_zona") ?? "").trim();
    const municipio = String(formData.get("gen_municipio") ?? "").trim();
    const areaCatalogo = String(formData.get("gen_area") ?? "").trim();
    const responsable = String(formData.get("gen_responsable") ?? "").trim();
    const tipoLicencia = String(formData.get("gen_tipo_licencia") ?? "").trim();
    const fotoLicencia = String(formData.get("gen_foto_licencia") ?? "").trim();

    // Vehículo
    const tipoVehiculo = String(formData.get("veh_tipo_vehiculo") ?? "").trim();
    const numeroEconomico = String(formData.get("veh_numero_economico") ?? "").trim();
    const modelo = String(formData.get("veh_modelo") ?? "").trim();

    // Carga
    const tipoCombustible = String(formData.get("carg_tipo_combustible") ?? "").trim();
    const fotoOdometroAntes = String(formData.get("carg_foto_odometro_antes") ?? "").trim();
    const fotoOdometroDespues = String(formData.get("carg_foto_odometro_despues") ?? "").trim();
    const fotoEvidenciaBomba1 = String(formData.get("carg_foto_evidencia_bomba_1") ?? "").trim();
    const fotoEvidenciaBomba2 = String(formData.get("carg_foto_evidencia_bomba_2") ?? "").trim();
    const fotoTicket = String(formData.get("carg_foto_ticket") ?? "").trim();
    const observaciones = String(formData.get("carg_observaciones") ?? "").trim();
    const firmaResponsable = String(formData.get("carg_firma_responsable") ?? "").trim();

    if (!fecha) return { ok: false, error: "La fecha es obligatoria." };
    if (!zona || !(ESTADOS_CARGA as readonly string[]).includes(zona))
      return { ok: false, error: "Estado no válido." };
    if (!municipio) return { ok: false, error: "El municipio es obligatorio." };
    if (!areaCatalogo) return { ok: false, error: "El área es obligatoria." };
    if (!responsable) return { ok: false, error: "El responsable es obligatorio." };
    if (!tipoLicencia) return { ok: false, error: "El tipo de licencia es obligatorio." };
    if (!fotoLicencia) return { ok: false, error: "La foto de licencia es obligatoria." };
    if (!numeroEconomico) return { ok: false, error: "El número económico es obligatorio." };
    if (!tipoCombustible || !(TIPOS_COMBUSTIBLE_CARGA as readonly string[]).includes(tipoCombustible))
      return { ok: false, error: "Tipo de combustible no válido." };
    if (!fotoOdometroAntes) return { ok: false, error: "La foto del odómetro antes es obligatoria." };
    if (!fotoOdometroDespues) return { ok: false, error: "La foto del odómetro después es obligatoria." };
    if (!fotoEvidenciaBomba1) return { ok: false, error: "La evidencia de bomba es obligatoria." };
    if (!fotoTicket) return { ok: false, error: "La foto del ticket es obligatoria." };

    const unidad = await prisma.unidad.findUnique({
      where: { numeroEconomico },
      select: { proyectoId: true },
    });
    if (!unidad) return { ok: false, error: "La unidad no existe." };

    const permitidos = await proyectosPermitidosParaModulo("A.1");
    if (permitidos !== null && (!unidad.proyectoId || !permitidos.includes(unidad.proyectoId)))
      return { ok: false, error: "No tienes permiso para realizar esta acción." };

    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

    const respuestas: Record<string, string> = {
      fecha,
      zona,
      municipio,
      area: areaCatalogo,
      responsable,
      tipo_licencia: tipoLicencia,
      foto_licencia: fotoLicencia,
      tipo_vehiculo: tipoVehiculo,
      numero_economico: numeroEconomico,
      modelo,
      tipo_combustible: tipoCombustible,
      foto_odometro_antes: fotoOdometroAntes,
      foto_odometro_despues: fotoOdometroDespues,
      foto_evidencia_bomba_1: fotoEvidenciaBomba1,
      foto_ticket: fotoTicket,
    };
    if (fotoEvidenciaBomba2) respuestas.foto_evidencia_bomba_2 = fotoEvidenciaBomba2;
    if (observaciones) respuestas.observaciones = observaciones;
    if (firmaResponsable) respuestas.firma_responsable = firmaResponsable;

    const checklist = await prisma.checklist.create({
      data: {
        numeroEconomico,
        tipo: "CARGA_COMBUSTIBLE",
        fecha: parseFechaLocalMx(fecha)!,
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
      detalle: { numeroEconomico, tipo: "CARGA_COMBUSTIBLE", tipoCombustible },
    });

    revalidatePath("/checklist");
    revalidatePath(`/unidades/${numeroEconomico}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el checklist de carga de combustible." };
  }
}
