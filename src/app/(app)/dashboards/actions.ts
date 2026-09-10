"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { tienePermisoModulo } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { calcularEstatusFlotaReporte, type EstatusFlotaReporte } from "@/lib/reportes/estatus-flota";
import { generarEstatusFlotaBuffer } from "@/lib/reportes/estatus-flota-pdf";
import type { IndicadorDashboard } from "@/components/dashboard/EstatusFlotaDocument";
import { sanearOrdenSecciones, type SeccionReporteId } from "@/lib/reportes/estatus-flota-secciones";
import type { CampoExtraSeleccionado } from "@/lib/reportes/campos-extra-tipos";
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

const TIPOS_GRAFICA_VALIDOS: TipoGrafica[] = ["barras", "lineas", "pie", "contador", "puntos", "divergente", "histograma", "dispersion", "calendario", "caja", "piramide", "mapa", "avance"];
const ORDENES_VALIDOS: TipoOrden[] = ["dimension", "valor_desc", "valor_asc"];
const ORIENTACIONES_VALIDAS = ["vertical", "horizontal"] as const;
const COLORIMETRIAS_VALIDAS = ["positivo", "negativo"] as const;
const VISTAS_PREFERIDAS_VALIDAS = ["grafica", "tabla"] as const;
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
    const { id, label, dataset, ejeX, ejeY, agregacion, tipoGrafica, layout, ejeSplit, ejeMeta, orden, orientacion, colorimetria, vistaPreferida, filtros, proyectoIds, emiteFiltro, escuchaFiltro } = w as Record<string, unknown>;
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
      if (tipoGrafica !== "dispersion" && tipoGrafica !== "caja" && tipoGrafica !== "avance" && !agregacionesDisponibles(campoY).includes(agregacion as TipoAgregacion)) return null;
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

    let ejeMetaLimpio: string | undefined;
    if (requisitos.ejeMeta) {
      if (typeof ejeMeta !== "string") return null;
      const campoMeta = obtenerCampo(ds, ejeMeta);
      if (!campoMeta || !campoValidoParaEje(campoMeta, requisitos.ejeMeta)) return null;
      ejeMetaLimpio = ejeMeta;
    }

    let ordenLimpio: TipoOrden | undefined;
    if (orden !== undefined) {
      if (!ORDENES_VALIDOS.includes(orden as TipoOrden)) return null;
      ordenLimpio = orden as TipoOrden;
    }

    let orientacionLimpia: "vertical" | "horizontal" | undefined;
    if (orientacion !== undefined) {
      if (!ORIENTACIONES_VALIDAS.includes(orientacion as "vertical" | "horizontal")) return null;
      orientacionLimpia = orientacion as "vertical" | "horizontal";
    }

    let colorimetriaLimpia: "positivo" | "negativo" | undefined;
    if (colorimetria !== undefined) {
      if (!COLORIMETRIAS_VALIDAS.includes(colorimetria as "positivo" | "negativo")) return null;
      colorimetriaLimpia = colorimetria as "positivo" | "negativo";
    }

    let vistaPreferidaLimpia: "grafica" | "tabla" | undefined;
    if (vistaPreferida !== undefined) {
      if (!VISTAS_PREFERIDAS_VALIDAS.includes(vistaPreferida as "grafica" | "tabla")) return null;
      vistaPreferidaLimpia = vistaPreferida as "grafica" | "tabla";
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
      ejeMeta: ejeMetaLimpio,
      orden: ordenLimpio,
      orientacion: orientacionLimpia,
      colorimetria: colorimetriaLimpia,
      vistaPreferida: vistaPreferidaLimpia,
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

async function calcularReporteConAlcance(input: { proyectoIds: string[]; desde: string; hasta: string; camposExtra?: CampoExtraSeleccionado[] }): Promise<EstatusFlotaReporte> {
  const permitidos = await alcanceGeneralPermitido();
  const seleccionValidada = await validarSeleccion(input.proyectoIds, permitidos);
  return calcularEstatusFlotaReporte({
    proyectoIdsPermitidos: permitidos,
    proyectoIdsSeleccionados: seleccionValidada,
    desde: new Date(input.desde),
    hasta: new Date(input.hasta),
    camposExtraSeleccionados: (input.camposExtra ?? []).slice(0, MAX_CAMPOS_EXTRA),
  });
}

export type ResultadoDatosEstatusFlota = { ok: true; datos: EstatusFlotaReporte } | { ok: false; error: string };

/** Datos del reporte para armar el PDF en el cliente ("Descargar PDF"). */
export async function obtenerDatosEstatusFlota(input: { proyectoIds: string[]; desde: string; hasta: string; camposExtra?: CampoExtraSeleccionado[] }): Promise<ResultadoDatosEstatusFlota> {
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
  camposExtra?: CampoExtraSeleccionado[];
  /** Indicadores tal cual se ven en "Mis dashboards" al momento de pedir el envío — ver EstatusFlotaModal. Ausente en el envío automático programado (no hay dashboard abierto). */
  indicadoresDashboard?: IndicadorDashboard[];
  /** Orden de secciones elegido en el modal — ver estatus-flota-secciones.ts. */
  ordenSecciones?: SeccionReporteId[];
}): Promise<ResultadoSimple> {
  if (!(await tienePermisoModulo("M"))) return { ok: false, error: "No tienes permiso para generar este reporte." };
  if (input.destinatarios.length === 0) return { ok: false, error: "Indica al menos un destinatario." };

  try {
    const datos = await calcularReporteConAlcance(input);
    const buffer = await generarEstatusFlotaBuffer(datos, input.indicadoresDashboard, input.ordenSecciones && sanearOrdenSecciones(input.ordenSecciones));
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
  /** Día de la semana: 0 = domingo … 6 = sábado (getUTCDay, hora México). */
  diaSemana: number;
  /** Ventana de datos que cubre cada envío, en días hacia atrás (ej. 7, 15, 30, 60, 90). */
  periodoDias: number;
  destinatarios: string[];
  activo: boolean;
  /** Datos adicionales elegidos libremente (cualquier "etiqueta" del catálogo BI) — ver campos-extra.ts. */
  camposExtra: CampoExtraSeleccionado[];
  /** Orden de las secciones del PDF elegido en el modal — ver estatus-flota-secciones.ts. */
  ordenSecciones: SeccionReporteId[];
};

const TIPO_ESTATUS_FLOTA = "estatus_flota";
const MAX_CAMPOS_EXTRA = 18;

/**
 * Envío automático semanal — un único ReporteProgramado (tipo "estatus_flota"),
 * administrado desde este modal en vez de listarse en /reportes/generador
 * (a pedido explícito: no debe verse como un módulo aparte). Corre el día de
 * la semana configurado, igual que cualquier otro reporte SEMANAL de la
 * plataforma (ver src/app/api/cron/reportes-programados/route.ts).
 */
const PERIODOS_DIAS_VALIDOS = [7, 15, 30, 60, 90];

export async function guardarProgramacionEstatusFlota(input: {
  id: string | null;
  proyectoIds: string[];
  hora: string;
  diaSemana: number;
  periodoDias: number;
  destinatarios: string[];
  activo: boolean;
  camposExtra: CampoExtraSeleccionado[];
  ordenSecciones: SeccionReporteId[];
}): Promise<ResultadoSimple> {
  const session = await auth();
  if (!(await tienePermisoModulo("M", "editar")) || !session?.user?.id) {
    return { ok: false, error: "No tienes permiso para configurar el envío automático." };
  }

  if (!Number.isInteger(input.diaSemana) || input.diaSemana < 0 || input.diaSemana > 6) {
    return { ok: false, error: "Día de la semana inválido." };
  }
  if (!PERIODOS_DIAS_VALIDOS.includes(input.periodoDias)) {
    return { ok: false, error: "Periodo de datos inválido." };
  }
  const camposExtraValidos = input.camposExtra
    .filter((c) => {
      const dataset = obtenerDataset(c.datasetId);
      return !!dataset && !!obtenerCampo(dataset, c.campoId);
    })
    .slice(0, MAX_CAMPOS_EXTRA);

  const data = {
    nombre: "Estatus semanal de flota",
    tipo: TIPO_ESTATUS_FLOTA,
    camposJson: [],
    filtrosJson: { proyectoIds: input.proyectoIds, camposExtra: camposExtraValidos, ordenSecciones: sanearOrdenSecciones(input.ordenSecciones) },
    destinatarios: input.destinatarios,
    hora: input.hora,
    diaSemana: input.diaSemana,
    periodoDias: input.periodoDias,
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
