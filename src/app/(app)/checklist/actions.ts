"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PUNTOS_INSPECCION } from "@/lib/checklist";
import { SECCIONES_CHECKLIST_SEMANAL, esNoAplica } from "@/lib/checklist-semanal";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { parseFechaLocalMx } from "@/lib/timezone";
import { ESTADOS_CARGA, AREAS_CARGA, TIPOS_COMBUSTIBLE_CARGA } from "@/lib/checklist-carga-combustible";
import { DEPARTAMENTOS_FALLA, TIPOS_FALLA, MAX_FOTOS_REPORTE_FALLA } from "@/lib/checklist-reporte-falla";
import { enviarNotificacionReporteFalla } from "@/lib/email";
import { resolverIdentidadTurno, mismaIdentidad } from "@/lib/identidad-turno";
import { tieneAlertaChecklist, construirHojasExcelChecklists, construirHojaIndicadores, TIPO_CHECKLIST_LABEL } from "@/lib/checklist-exportar";
import { generarExcelBuffer } from "@/lib/exportar-excel";
import { enviarChecklistsExcel } from "@/lib/email";
import type { TipoChecklist, TipoVehiculo } from "@/generated/prisma/enums";

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
    // la unidad tomada activamente en "Mi Turno" en este momento. Solo esa
    // misma persona puede completar el checklist de esa unidad — si Libia
    // tiene la G5-002 tomada, solo Libia (con su propia sesión) puede hacer
    // el checklist de la G5-002, no cualquier otra cuenta con permiso de módulo.
    const sesionActiva = await prisma.bitacoraUsoUnidad.findFirst({
      where: { numeroEconomico, fin: null },
      include: { operador: { select: { nombre: true } }, usuario: { select: { nombre: true } } },
    });
    const responsable = sesionActiva?.operador?.nombre ?? sesionActiva?.usuario?.nombre ?? null;
    if (!sesionActiva || !responsable) {
      return { ok: false, error: 'Esta unidad no tiene un responsable activo. Debe tomarse primero desde "Mi Turno".' };
    }

    const identidadPropia = await resolverIdentidadTurno();
    if (!mismaIdentidad(identidadPropia, { operadorId: sesionActiva.operadorId, usuarioId: sesionActiva.usuarioId })) {
      return { ok: false, error: `Esta unidad la tiene tomada ${responsable}. Solo esa persona puede completar su checklist.` };
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
          if (campo.fotoRequerido && !fotoValor && !esNoAplica(valor)) camposFaltantes.push(campo.fotoLabel ?? campo.fotoKey);
          if (fotoValor) respuestas[campo.fotoKey] = fotoValor;
        }
      }
    }

    const firmaResponsable = String(formData.get("sig_responsable") ?? "").trim();
    if (!firmaResponsable) camposFaltantes.push("Firma del responsable");
    if (firmaResponsable) respuestas.firma_responsable = firmaResponsable;

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
    const porcentajeAntes = String(formData.get("carg_porcentaje_antes") ?? "").trim();
    const porcentajeDespues = String(formData.get("carg_porcentaje_despues") ?? "").trim();
    const litrosCargados = String(formData.get("carg_litros_cargados") ?? "").trim();
    const cantidadPagada = String(formData.get("carg_cantidad_pagada") ?? "").trim();
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
    if (!porcentajeAntes || Number(porcentajeAntes) < 0 || Number(porcentajeAntes) > 100)
      return { ok: false, error: "El % de combustible antes de la carga es obligatorio y debe estar entre 0 y 100." };
    if (!porcentajeDespues || Number(porcentajeDespues) < 0 || Number(porcentajeDespues) > 100)
      return { ok: false, error: "El % de combustible después de la carga es obligatorio y debe estar entre 0 y 100." };
    if (!litrosCargados || Number(litrosCargados) <= 0) return { ok: false, error: "Los litros cargados son obligatorios." };
    if (!cantidadPagada || Number(cantidadPagada) <= 0) return { ok: false, error: "La cantidad pagada es obligatoria." };
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
      porcentaje_antes: porcentajeAntes,
      porcentaje_despues: porcentajeDespues,
      litros_cargados: litrosCargados,
      cantidad_pagada: cantidadPagada,
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

/**
 * Checklist "Reporte de falla de vehículo" (ver src/lib/checklist-reporte-falla.ts).
 * A diferencia de los otros tres tipos, al crearse dispara de inmediato un
 * correo al Gerente administrativo del proyecto de la unidad — resuelto
 * dinámicamente por rol + asignación de proyecto (no una lista configurada a
 * mano). El envío nunca debe tumbar la creación del reporte si falla.
 */
export async function crearChecklistReporteFalla(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await exigirPermisoModulo("A.1", "editar");

    const numeroEconomico = String(formData.get("numeroEconomico") ?? "").trim();
    const kilometraje = parseInt(String(formData.get("kilometraje") ?? ""), 10);
    const fecha = String(formData.get("fecha") ?? "").trim();
    const hora = String(formData.get("hora") ?? "").trim();
    const nombreConductor = String(formData.get("nombreConductor") ?? "").trim();
    const departamento = String(formData.get("departamento") ?? "").trim();
    const tipoFalla = String(formData.get("tipoFalla") ?? "").trim();
    const descripcionFalla = String(formData.get("descripcionFalla") ?? "").trim();
    const observaciones = String(formData.get("observaciones") ?? "").trim();

    if (!numeroEconomico) return { ok: false, error: "El número económico es obligatorio." };
    if (!kilometraje) return { ok: false, error: "El kilometraje actual es obligatorio." };
    if (!fecha) return { ok: false, error: "La fecha del reporte es obligatoria." };
    if (!departamento || !(DEPARTAMENTOS_FALLA as readonly string[]).includes(departamento))
      return { ok: false, error: "Selecciona un departamento válido." };
    if (!tipoFalla || !(TIPOS_FALLA as readonly string[]).includes(tipoFalla))
      return { ok: false, error: "Selecciona un tipo de falla válido." };

    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    if (!unidad) return { ok: false, error: "La unidad no existe." };

    const permitidos = await proyectosPermitidosParaModulo("A.1");
    if (permitidos !== null && (!unidad.proyectoId || !permitidos.includes(unidad.proyectoId)))
      return { ok: false, error: "No tienes permiso para realizar esta acción." };

    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

    const fechaReporte = parseFechaLocalMx(fecha)!;
    if (hora) {
      const [hh, mm] = hora.split(":").map((n) => parseInt(n, 10));
      if (!Number.isNaN(hh)) fechaReporte.setHours(hh, Number.isNaN(mm) ? 0 : mm, 0, 0);
    }

    const respuestas: Record<string, string> = {
      kilometraje: String(kilometraje),
      departamento,
      tipo_falla: tipoFalla,
    };
    if (nombreConductor) respuestas.nombre_conductor = nombreConductor;
    if (descripcionFalla) respuestas.descripcion_falla = descripcionFalla;
    if (observaciones) respuestas.observaciones = observaciones;
    for (let i = 1; i <= MAX_FOTOS_REPORTE_FALLA; i++) {
      const url = String(formData.get(`foto_${i}`) ?? "").trim();
      if (url) respuestas[`foto_${i}`] = url;
    }

    const checklist = await prisma.checklist.create({
      data: {
        numeroEconomico,
        tipo: "REPORTE_FALLA",
        fecha: fechaReporte,
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
      detalle: { numeroEconomico, tipo: "REPORTE_FALLA", tipoFalla },
    });

    revalidatePath("/checklist");
    invalidarCacheBI(["checklist"]);
    revalidatePath(`/unidades/${numeroEconomico}`);

    if (unidad.proyectoId) {
      try {
        const gerentes = await prisma.usuario.findMany({
          where: {
            estatus: "ACTIVO",
            rol: { nombre: "Gerente administrativo" },
            proyectos: { some: { proyectoId: unidad.proyectoId } },
          },
          select: { correo: true },
        });
        const destinatarios = gerentes.map((g) => g.correo);
        if (destinatarios.length > 0) {
          await enviarNotificacionReporteFalla({
            destinatarios,
            numeroEconomico,
            tipoFalla,
            departamento,
            descripcion: descripcionFalla || null,
          });
        }
      } catch (error) {
        console.error("Error al enviar notificación de reporte de falla", error);
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el reporte de falla." };
  }
}

export type IndicadorChecklistUnidad = {
  numeroEconomico: string;
  marcaModelo: string;
  tipoVehiculo: string;
  proyecto: string | null;
  nivelAceite: string | null;
  estadoGato: string | null;
  peorLlanta: string | null;
  algunaLlantaNA: boolean;
  fecha: Date;
};

/**
 * Último checklist SEMANAL registrado de cada unidad activa (uno por unidad,
 * el más reciente), con 3 señales ya extraídas del JSON `respuestasSemanal`
 * para armar filtros rápidos tipo "qué unidades tienen aceite bajo / sin
 * gato / llanta crítica" — mismas keys/expresión de "peor llanta" que el
 * dataset BI "checklist" (ver src/lib/bi/metadata.ts), para que ambos
 * lugares cuenten exactamente lo mismo.
 */
export async function obtenerIndicadoresChecklistSemanal(proyectosPermitidos: string[] | null): Promise<IndicadorChecklistUnidad[]> {
  await exigirPermisoModulo("A.1");

  const filtroProyecto = proyectosPermitidos !== null ? Prisma.sql`AND u."proyectoId" IN (${Prisma.join(proyectosPermitidos)})` : Prisma.empty;

  return prisma.$queryRaw<IndicadorChecklistUnidad[]>`
    SELECT DISTINCT ON (c."numeroEconomico")
      c."numeroEconomico" AS "numeroEconomico",
      (u."marca" || ' ' || u."unidadModelo") AS "marcaModelo",
      u."tipoVehiculo"::text AS "tipoVehiculo",
      p."nombre" AS "proyecto",
      c."respuestasSemanal"->>'niv_nivel_aceite' AS "nivelAceite",
      c."respuestasSemanal"->>'her_gato' AS "estadoGato",
      (CASE (
        SELECT MIN(v) FROM unnest(ARRAY[
          CASE c."respuestasSemanal"->>'ext_llanta_del_der' WHEN '100% (NUEVA)' THEN 100 WHEN '75%' THEN 75 WHEN '50%' THEN 50 WHEN '25%' THEN 25 WHEN '0% (REEMPLAZAR)' THEN 0 ELSE NULL END,
          CASE c."respuestasSemanal"->>'ext_llanta_tras_der' WHEN '100% (NUEVA)' THEN 100 WHEN '75%' THEN 75 WHEN '50%' THEN 50 WHEN '25%' THEN 25 WHEN '0% (REEMPLAZAR)' THEN 0 ELSE NULL END,
          CASE c."respuestasSemanal"->>'ext_llanta_tras_izq' WHEN '100% (NUEVA)' THEN 100 WHEN '75%' THEN 75 WHEN '50%' THEN 50 WHEN '25%' THEN 25 WHEN '0% (REEMPLAZAR)' THEN 0 ELSE NULL END,
          CASE c."respuestasSemanal"->>'ext_llanta_del_izq' WHEN '100% (NUEVA)' THEN 100 WHEN '75%' THEN 75 WHEN '50%' THEN 50 WHEN '25%' THEN 25 WHEN '0% (REEMPLAZAR)' THEN 0 ELSE NULL END,
          CASE c."respuestasSemanal"->>'ext_llanta_refaccion' WHEN '100% (NUEVA)' THEN 100 WHEN '75%' THEN 75 WHEN '50%' THEN 50 WHEN '25%' THEN 25 WHEN '0% (REEMPLAZAR)' THEN 0 ELSE NULL END
        ]) AS t(v)
      )
        WHEN 100 THEN '100% (NUEVA)'
        WHEN 75 THEN '75%'
        WHEN 50 THEN '50%'
        WHEN 25 THEN '25%'
        WHEN 0 THEN '0% (REEMPLAZAR)'
        ELSE NULL
      END) AS "peorLlanta",
      EXISTS (
        SELECT 1 FROM unnest(ARRAY[
          c."respuestasSemanal"->>'ext_llanta_del_der',
          c."respuestasSemanal"->>'ext_llanta_tras_der',
          c."respuestasSemanal"->>'ext_llanta_tras_izq',
          c."respuestasSemanal"->>'ext_llanta_del_izq',
          c."respuestasSemanal"->>'ext_llanta_refaccion'
        ]) AS t(v) WHERE v = 'N/A'
      ) AS "algunaLlantaNA",
      c."fecha" AS "fecha"
    FROM "Checklist" c
    JOIN "Unidad" u ON u."numeroEconomico" = c."numeroEconomico"
    LEFT JOIN "Proyecto" p ON p.id = u."proyectoId"
    WHERE c."tipo" = 'SEMANAL' AND u."estatus" != 'BAJA' ${filtroProyecto}
    ORDER BY c."numeroEconomico", c."fecha" DESC
  `;
}

/**
 * Precio promedio por litro de los últimos 90 días de cargas de combustible
 * registradas en el checklist, usado como referencia para detectar precios
 * fuera de rango (ver detectarAlertasCargaCombustible). No se segmenta por
 * estación/gasolinera porque el checklist no captura ese dato — es un
 * promedio global reciente.
 */
export async function obtenerPrecioPromedioLitroCargaCombustible(): Promise<number | null> {
  await exigirPermisoModulo("A.1");

  const filas = await prisma.$queryRaw<{ promedio: number | null }[]>`
    SELECT AVG(
      (c."respuestasSemanal"->>'cantidad_pagada')::numeric / (c."respuestasSemanal"->>'litros_cargados')::numeric
    ) AS "promedio"
    FROM "Checklist" c
    WHERE c."tipo" = 'CARGA_COMBUSTIBLE'
      AND c."fecha" >= NOW() - INTERVAL '90 days'
      AND (c."respuestasSemanal"->>'litros_cargados') ~ '^[0-9]+(\.[0-9]+)?$'
      AND (c."respuestasSemanal"->>'cantidad_pagada') ~ '^[0-9]+(\.[0-9]+)?$'
      AND (c."respuestasSemanal"->>'litros_cargados')::numeric > 0
  `;
  const promedio = filas[0]?.promedio;
  return promedio != null ? Number(promedio) : null;
}

export type ChecklistParaExportar = {
  id: string;
  tipo: TipoChecklist;
  fecha: Date;
  odometro: number | null;
  horometro: number | null;
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string };
  respuestasSemanal: Record<string, string>;
  puntosInspeccion: Record<string, string> | null;
  capturadoPor: { nombre: string } | null;
  alerta: boolean;
};

/**
 * Checklists de uno o varios tipos en un rango de fechas, para el botón
 * "Exportar checklist" de /checklist — misma forma y misma lógica de alerta
 * que /checklist/historial (ver src/lib/checklist-exportar.ts), para que
 * ambos exportadores produzcan el mismo resultado.
 */
export async function obtenerChecklistsParaExportar(input: {
  tipos: TipoChecklist[];
  desde: string;
  hasta: string;
  proyectoId?: string;
  tipoVehiculo?: string;
}): Promise<ChecklistParaExportar[]> {
  await exigirPermisoModulo("A.1");
  if (!input.tipos.length) return [];

  const proyectosPermitidos = await proyectosPermitidosParaModulo("A.1");
  const inicio = parseFechaLocalMx(input.desde)!;
  const fin = new Date(parseFechaLocalMx(input.hasta)!.getTime() + 24 * 60 * 60 * 1000 - 1);

  const checklists = await prisma.checklist.findMany({
    where: {
      tipo: { in: input.tipos },
      fecha: { gte: inicio, lte: fin },
      unidad: {
        ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}),
        ...(input.proyectoId ? { proyectoId: input.proyectoId } : {}),
        ...(input.tipoVehiculo ? { tipoVehiculo: input.tipoVehiculo as TipoVehiculo } : {}),
      },
    },
    include: {
      unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true, capacidadTanqueLitros: true } },
      capturadoPor: { select: { nombre: true } },
    },
    orderBy: { fecha: "desc" },
    take: 5000,
  });

  const precioPromedioLitroCombustible = input.tipos.includes("CARGA_COMBUSTIBLE") ? await obtenerPrecioPromedioLitroCargaCombustible() : null;

  return checklists.map((c) => {
    const respuestas = (c.respuestasSemanal as Record<string, string>) ?? {};
    const puntosInspeccion = (c.puntosInspeccion as Record<string, string>) ?? null;
    const capacidadTanqueLitros = c.unidad.capacidadTanqueLitros ? Number(c.unidad.capacidadTanqueLitros) : null;
    return {
      id: c.id,
      tipo: c.tipo,
      fecha: c.fecha,
      odometro: c.odometro,
      horometro: c.horometro,
      unidad: { numeroEconomico: c.unidad.numeroEconomico, marca: c.unidad.marca, unidadModelo: c.unidad.unidadModelo },
      respuestasSemanal: respuestas,
      puntosInspeccion,
      capturadoPor: c.capturadoPor,
      alerta: tieneAlertaChecklist(c.tipo, respuestas, puntosInspeccion, capacidadTanqueLitros, precioPromedioLitroCombustible),
    };
  });
}

/** Wrapper delgado para el botón "Exportar checklist" (incluye indicadores como hoja opcional) — misma fuente que la sección Indicadores de /checklist. */
export async function obtenerIndicadoresParaExportar(): Promise<IndicadorChecklistUnidad[]> {
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A.1");
  return obtenerIndicadoresChecklistSemanal(proyectosPermitidos);
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Envía por correo (bajo demanda, sin programación) el mismo Excel que
 * genera el botón "Exportar checklist" — adjunto, no un resumen visual en
 * el cuerpo del correo (así lo pidió el usuario).
 */
export async function enviarChecklistsPorCorreo(input: {
  tipos: TipoChecklist[];
  desde: string;
  hasta: string;
  proyectoId?: string;
  tipoVehiculo?: string;
  destinatarios: string[];
  incluirIndicadores?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await exigirPermisoModulo("A.1");

  const destinatarios = input.destinatarios.map((d) => d.trim()).filter(Boolean);
  if (destinatarios.length === 0) return { ok: false, error: "Agrega al menos un destinatario." };
  const invalidos = destinatarios.filter((d) => !REGEX_EMAIL.test(d));
  if (invalidos.length > 0) return { ok: false, error: `Correo(s) inválido(s): ${invalidos.join(", ")}` };

  const checklists = await obtenerChecklistsParaExportar(input);
  const hojas = construirHojasExcelChecklists(checklists);
  if (input.incluirIndicadores) {
    const indicadores = await obtenerIndicadoresParaExportar();
    if (indicadores.length > 0) hojas.push(construirHojaIndicadores(indicadores));
  }
  if (hojas.length === 0) return { ok: false, error: "No hay checklists para los filtros elegidos." };

  const buffer = generarExcelBuffer(hojas);
  const tiposTexto = input.tipos.map((t) => TIPO_CHECKLIST_LABEL[t]).join(", ") || "Indicadores";
  const resultado = await enviarChecklistsExcel({
    destinatarios,
    buffer,
    nombreArchivo: `checklists-${input.desde}_${input.hasta}.xlsx`,
    resumen: `${tiposTexto} del ${input.desde} al ${input.hasta}`,
  });
  if (!resultado.enviado) return { ok: false, error: resultado.error ?? "No se pudo enviar el correo." };
  return { ok: true };
}
