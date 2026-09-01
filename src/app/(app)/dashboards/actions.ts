"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { tienePermisoModulo } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { calcularEstatusFlotaReporte, type EstatusFlotaReporte } from "@/lib/reportes/estatus-flota";
import { generarEstatusFlotaBuffer } from "@/lib/reportes/estatus-flota-pdf";
import { enviarReporteBI } from "@/lib/email";
import {
  obtenerDataset,
  obtenerCampo,
  agregacionesDisponibles,
  campoValidoParaEje,
  REQUISITOS_TIPO_GRAFICA,
  type WidgetDashboardBI,
  type FiltroGuardable,
  type TipoAgregacion,
  type TipoGrafica,
  type TipoOrden,
  type LayoutWidget,
  type DatasetMeta,
} from "@/lib/bi/metadata";

export type ResultadoVistaDashboard = { ok: boolean; error?: string; id?: string };

const TIPOS_GRAFICA_VALIDOS: TipoGrafica[] = ["barras", "lineas", "pie", "contador", "puntos", "divergente", "histograma", "dispersion", "calendario", "caja", "piramide", "mapa"];
const ORDENES_VALIDOS: TipoOrden[] = ["dimension", "valor_desc", "valor_asc"];
const MAX_FILTROS = 20;
const MAX_VALORES_POR_FILTRO = 100;

function validarFiltros(filtros: unknown, ds: DatasetMeta): FiltroGuardable[] | undefined | null {
  if (filtros === undefined) return undefined;
  if (!Array.isArray(filtros) || filtros.length > MAX_FILTROS) return null;
  const limpios: FiltroGuardable[] = [];
  for (const f of filtros) {
    if (!f || typeof f !== "object") return null;
    const { campoId, valores } = f as Record<string, unknown>;
    if (typeof campoId !== "string" || !obtenerCampo(ds, campoId)) return null;
    if (!Array.isArray(valores) || valores.length > MAX_VALORES_POR_FILTRO || !valores.every((v) => typeof v === "string")) return null;
    limpios.push({ campoId, valores: valores.map((v: string) => v.slice(0, 200)) });
  }
  return limpios;
}

function validarProyectoIds(proyectoIds: unknown): string[] | undefined | null {
  if (proyectoIds === undefined) return undefined;
  if (!Array.isArray(proyectoIds) || !proyectoIds.every((id) => typeof id === "string")) return null;
  return proyectoIds;
}

function validarLayout(layout: unknown): LayoutWidget | null {
  if (!layout || typeof layout !== "object") return null;
  const { x, y, w, h } = layout as Record<string, unknown>;
  if (![x, y, w, h].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)) return null;
  return { x: x as number, y: y as number, w: w as number, h: h as number };
}

function validarWidgets(widgets: unknown): WidgetDashboardBI[] | null {
  if (!Array.isArray(widgets)) return null;
  const limpios: WidgetDashboardBI[] = [];
  for (const w of widgets) {
    if (!w || typeof w !== "object") return null;
    const { id, label, dataset, ejeX, ejeY, agregacion, tipoGrafica, layout, ejeSplit, orden, filtros, proyectoIds, emiteFiltro, escuchaFiltro } = w as Record<string, unknown>;
    if (typeof id !== "string" || typeof label !== "string") return null;
    if (typeof dataset !== "string" || typeof ejeX !== "string" || typeof ejeY !== "string") return null;
    if (!TIPOS_GRAFICA_VALIDOS.includes(tipoGrafica as TipoGrafica)) return null;
    if (agregacion !== "conteo" && agregacion !== "suma" && agregacion !== "promedio") return null;

    const ds = obtenerDataset(dataset);
    if (!ds) return null;
    const requisitos = REQUISITOS_TIPO_GRAFICA[tipoGrafica as TipoGrafica];
    const campoX = obtenerCampo(ds, ejeX);
    if (!campoX || !campoValidoParaEje(campoX, requisitos.ejeX)) return null;

    if (requisitos.ejeY !== "ninguno") {
      const campoY = obtenerCampo(ds, ejeY);
      if (!campoY || !campoValidoParaEje(campoY, requisitos.ejeY)) return null;
      if (tipoGrafica !== "dispersion" && tipoGrafica !== "caja" && !agregacionesDisponibles(campoY).includes(agregacion as TipoAgregacion)) return null;
    }

    let ejeSplitLimpio: string | undefined;
    if (requisitos.ejeSplit) {
      if (requisitos.ejeSplit.obligatorio) {
        if (typeof ejeSplit !== "string" || !obtenerCampo(ds, ejeSplit)) return null;
        ejeSplitLimpio = ejeSplit;
      } else if (ejeSplit !== undefined) {
        if (typeof ejeSplit !== "string" || !obtenerCampo(ds, ejeSplit)) return null;
        ejeSplitLimpio = ejeSplit;
      }
    }

    let ordenLimpio: TipoOrden | undefined;
    if (orden !== undefined) {
      if (!ORDENES_VALIDOS.includes(orden as TipoOrden)) return null;
      ordenLimpio = orden as TipoOrden;
    }

    const filtrosLimpios = validarFiltros(filtros, ds);
    if (filtrosLimpios === null) return null;

    const proyectoIdsLimpios = validarProyectoIds(proyectoIds);
    if (proyectoIdsLimpios === null) return null;

    const layoutValido = validarLayout(layout);
    if (!layoutValido) return null;

    limpios.push({
      id,
      label: label.slice(0, 120),
      dataset,
      ejeX,
      ejeY,
      agregacion: agregacion as TipoAgregacion,
      tipoGrafica: tipoGrafica as TipoGrafica,
      ejeSplit: ejeSplitLimpio,
      orden: ordenLimpio,
      filtros: filtrosLimpios,
      proyectoIds: proyectoIdsLimpios,
      layout: layoutValido,
      emiteFiltro: emiteFiltro === true ? true : undefined,
      escuchaFiltro: escuchaFiltro === true ? true : undefined,
    });
  }
  return limpios;
}

export async function guardarVistaDashboard(input: { id?: string; nombre: string; widgets: WidgetDashboardBI[] }): Promise<ResultadoVistaDashboard> {
  if (!(await tienePermisoModulo("M", "editar"))) {
    return { ok: false, error: "No tienes permiso para guardar vistas de dashboard." };
  }

  const nombre = input.nombre.trim().slice(0, 120);
  if (!nombre) return { ok: false, error: "Ponle un nombre a la vista." };

  const widgets = validarWidgets(input.widgets);
  if (!widgets) return { ok: false, error: "Combinación inválida en uno de los widgets." };
  if (widgets.length === 0) return { ok: false, error: "Agrega al menos una combinación antes de guardar." };

  const session = await auth();
  const usuarioId = session?.user?.id;

  try {
    if (input.id) {
      const actualizada = await prisma.vistaDashboardBI.update({
        where: { id: input.id },
        data: { nombre, widgets },
      });
      if (usuarioId) {
        await logActivity({ userId: usuarioId, modulo: "dashboards", accion: "update", entidad: "VistaDashboardBI", entidadId: actualizada.id, detalle: { nombre } });
      }
      revalidatePath("/dashboards");
      return { ok: true, id: actualizada.id };
    }

    const creada = await prisma.vistaDashboardBI.create({
      data: { nombre, widgets, creadoPorId: usuarioId ?? null },
    });
    if (usuarioId) {
      await logActivity({ userId: usuarioId, modulo: "dashboards", accion: "create", entidad: "VistaDashboardBI", entidadId: creada.id, detalle: { nombre } });
    }
    revalidatePath("/dashboards");
    return { ok: true, id: creada.id };
  } catch {
    return { ok: false, error: "No se pudo guardar la vista." };
  }
}

export async function eliminarVistaDashboard(id: string): Promise<ResultadoVistaDashboard> {
  if (!(await tienePermisoModulo("M", "editar"))) {
    return { ok: false, error: "No tienes permiso para eliminar vistas de dashboard." };
  }
  if (!id) return { ok: false, error: "Vista inválida." };

  try {
    await prisma.vistaDashboardBI.delete({ where: { id } });
  } catch {
    return { ok: false, error: "No se pudo eliminar la vista." };
  }

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({ userId: session.user.id, modulo: "dashboards", accion: "delete", entidad: "VistaDashboardBI", entidadId: id });
  }

  revalidatePath("/dashboards");
  return { ok: true };
}

// ───────────────────────── Estatus semanal de flota ─────────────────────────
// SLA/disponibilidad/estatus/motivos/gastos — descarga y envío inmediato o
// programado desde el Dashboard (ver EstatusFlotaModal). No es un módulo
// aparte: se administra desde aquí, aunque por debajo reutiliza el mismo
// ReporteProgramado/motor de reportes que /reportes/generador.

export type ResultadoSimple = { ok: boolean; error?: string };

/**
 * Alcance completo permitido para el usuario actual (módulo M) — si está
 * limitado a ciertos proyectos, es "todos los suyos"; si no, null (sin
 * restricción). Se usa siempre para el bloque "general" del reporte, sin
 * importar qué haya seleccionado.
 */
async function alcanceGeneralPermitido(): Promise<string[] | null> {
  return proyectosPermitidosParaModulo("M");
}

/** Filtra la selección solicitada contra lo que el usuario tiene permitido — nunca se confía en lo que mande el cliente. */
async function validarSeleccion(proyectoIdsSolicitados: string[], permitidos: string[] | null): Promise<string[]> {
  if (permitidos === null) return proyectoIdsSolicitados;
  return proyectoIdsSolicitados.filter((id) => permitidos.includes(id));
}

async function calcularReporteConAlcance(input: { proyectoIds: string[]; desde: string; hasta: string }): Promise<EstatusFlotaReporte> {
  const permitidos = await alcanceGeneralPermitido();
  const seleccionValidada = await validarSeleccion(input.proyectoIds, permitidos);
  return calcularEstatusFlotaReporte({
    proyectoIdsPermitidos: permitidos,
    proyectoIdsSeleccionados: seleccionValidada,
    desde: new Date(input.desde),
    hasta: new Date(input.hasta),
  });
}

export type ResultadoDatosEstatusFlota = { ok: true; datos: EstatusFlotaReporte } | { ok: false; error: string };

/** Datos del reporte para armar el PDF en el cliente ("Descargar PDF"). */
export async function obtenerDatosEstatusFlota(input: { proyectoIds: string[]; desde: string; hasta: string }): Promise<ResultadoDatosEstatusFlota> {
  if (!(await tienePermisoModulo("M"))) return { ok: false, error: "No tienes permiso para generar este reporte." };
  try {
    const datos = await calcularReporteConAlcance(input);
    return { ok: true, datos: JSON.parse(JSON.stringify(datos)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo calcular el reporte." };
  }
}

/** "Enviar por correo ahora" — genera el PDF server-side y lo envía de inmediato, sin pasar por la programación. */
export async function enviarEstatusFlotaAhora(input: {
  proyectoIds: string[];
  desde: string;
  hasta: string;
  destinatarios: string[];
}): Promise<ResultadoSimple> {
  if (!(await tienePermisoModulo("M"))) return { ok: false, error: "No tienes permiso para generar este reporte." };
  if (input.destinatarios.length === 0) return { ok: false, error: "Indica al menos un destinatario." };

  try {
    const datos = await calcularReporteConAlcance(input);
    const buffer = await generarEstatusFlotaBuffer(datos);
    const nombreArchivo = `estatus-flota-${input.hasta}.pdf`;
    const envio = await enviarReporteBI({
      destinatarios: input.destinatarios,
      nombreReporte: "Estatus de flota",
      buffer,
      nombreArchivo,
      mime: "application/pdf",
    });
    if (!envio.enviado) return { ok: false, error: envio.error ?? "No se pudo enviar el correo." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo generar el reporte." };
  }
}

export type ConfigEstatusFlotaProgramado = {
  id: string | null;
  proyectoIds: string[];
  hora: string;
  destinatarios: string[];
  activo: boolean;
};

const TIPO_ESTATUS_FLOTA = "estatus_flota";

/**
 * Envío automático semanal — un único ReporteProgramado (tipo "estatus_flota"),
 * administrado desde este modal en vez de listarse en /reportes/generador
 * (a pedido explícito: no debe verse como un módulo aparte). Corre los
 * lunes, igual que cualquier otro reporte SEMANAL de la plataforma (ver
 * src/app/api/cron/reportes-programados/route.ts) — ese cron no cambia.
 */
export async function guardarProgramacionEstatusFlota(input: {
  id: string | null;
  proyectoIds: string[];
  hora: string;
  destinatarios: string[];
  activo: boolean;
}): Promise<ResultadoSimple> {
  const session = await auth();
  if (!(await tienePermisoModulo("M", "editar")) || !session?.user?.id) {
    return { ok: false, error: "No tienes permiso para configurar el envío automático." };
  }

  const data = {
    nombre: "Estatus semanal de flota",
    tipo: TIPO_ESTATUS_FLOTA,
    camposJson: [],
    filtrosJson: { proyectoIds: input.proyectoIds },
    destinatarios: input.destinatarios,
    hora: input.hora,
    frecuencia: "SEMANAL" as const,
    formato: "PDF" as const,
    activo: input.activo,
    creadoPorId: session.user.id,
  };

  try {
    if (input.id) {
      await prisma.reporteProgramado.update({ where: { id: input.id }, data });
    } else {
      await prisma.reporteProgramado.create({ data });
    }
    revalidatePath("/dashboards");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar la programación." };
  }
}
