// Cuerpo HTML del correo de "Estatus de flota" — reemplaza al PDF adjunto:
// mismo contenido/orden de secciones que EstatusFlotaDocument.tsx (ver ese
// archivo para la versión PDF de descarga), pero maquetado con <table> a la
// antigua para que se vea bien en clientes de correo (Outlook de escritorio
// no soporta flexbox/grid). Se pidió explícitamente que el correo ya no
// lleve PDF adjunto — todo el contenido va en el cuerpo.
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import { LABEL_MOTIVO } from "@/lib/reportes/estatus-flota-labels";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { fmtMoney } from "@/lib/formato";
import { KABAT_LOGO_DATA_URI } from "@/components/dashboard/kabat-logo-base64";
import type { EstatusFlota, EstatusFlotaReporte, FlotaProyecto } from "@/lib/reportes/estatus-flota";
import type { IndicadorDashboard } from "@/components/dashboard/EstatusFlotaDocument";
import { ORDEN_SECCIONES_DEFAULT, type SeccionReporteId } from "@/lib/reportes/estatus-flota-secciones";
import type { TipoVehiculo } from "@/generated/prisma/enums";

const NAVY = "#0f1b2d";
const BLUE = "#2b7fff";
const GREEN = "#22c55e";
const RED = "#ef4444";
const SLATE = "#6b7785";
const BORDER = "#e8ecef";
const SURFACE = "#f6f9fc";
const PALETA_BARRAS = ["#f59e0b", "#22c55e", "#6366f1", "#38bdf8", "#ef4444", "#a855f7", "#14b8a6", "#f43f5e"];
const TIPOS_VEHICULO_ORDEN: TipoVehiculo[] = ["CAMIONETA", "GRUA", "AUTO", "MOTO", "OTRO"];

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtFechaHtml(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }).replace(".", "");
}

function fmtFechaCorta(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { month: "short", day: "numeric" }).replace(".", "");
}

/** Fila de 1 a 3 tarjetas de igual ancho — misma agrupación que TARJETAS_POR_FILA en el PDF. */
function filaTarjetas(tarjetasHtml: string[]): string {
  const ancho = Math.round(100 / 3);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
      <tr>
        ${tarjetasHtml
          .map(
            (html, i) => `
          <td width="${ancho}%" valign="top" style="padding-right:${i < tarjetasHtml.length - 1 ? 12 : 0}px;">${html}</td>`
          )
          .join("")}
        ${Array.from({ length: 3 - tarjetasHtml.length })
          .map(() => `<td width="${ancho}%"></td>`)
          .join("")}
      </tr>
    </table>`;
}

function tarjeta(titulo: string, contenidoHtml: string): string {
  return `
    <div style="background:#ffffff; border:1px solid ${BORDER}; border-radius:8px; padding:14px; min-height:88px;">
      <div style="font-size:11px; font-weight:bold; color:${SLATE}; letter-spacing:0.6px; margin-bottom:8px;">${esc(titulo.toUpperCase())}</div>
      ${contenidoHtml}
    </div>`;
}

function kpi(valor: string, caption?: string): string {
  return `
    <div style="font-size:22px; font-weight:bold; color:${NAVY};">${valor}</div>
    ${caption ? `<div style="font-size:11px; color:${SLATE}; margin-top:4px;">${esc(caption)}</div>` : ""}`;
}

function barrasHorizontal(filas: { label: string; valor: number }[], vacio: string, formatear: (v: number) => string): string {
  if (filas.length === 0) return `<div style="font-size:11px; color:${SLATE}; font-style:italic;">${esc(vacio)}</div>`;
  const max = Math.max(...filas.map((f) => f.valor));
  return filas
    .map((f, i) => {
      const pct = max > 0 ? Math.max(2, Math.round((f.valor / max) * 100)) : 0;
      const color = PALETA_BARRAS[i % PALETA_BARRAS.length];
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td width="30%" style="font-size:10px; color:${SLATE};">${esc(f.label)}</td>
          <td width="50%">
            <div style="background:${SURFACE}; border-radius:3px; height:9px; overflow:hidden;">
              <div style="background:${color}; width:${pct}%; height:9px;"></div>
            </div>
          </td>
          <td width="20%" align="right" style="font-size:10px; font-weight:bold; color:${NAVY};">${esc(formatear(f.valor))}</td>
        </tr>
      </table>`;
    })
    .join("");
}

function seccionTitulo(texto: string): string {
  return `<div style="font-size:11px; font-weight:bold; color:${NAVY}; letter-spacing:0.5px; margin-bottom:8px;">${esc(texto)}</div>`;
}

function tablaUnidadesNoDisponibles(datos: EstatusFlota): string {
  if (datos.indisponibilidadDetalle.length === 0) return "";
  const filas = [...datos.indisponibilidadDetalle].sort((a, b) => {
    const etiquetaA = a.motivo === "SIN_MOTIVO" ? "Sin motivo" : LABEL_MOTIVO[a.motivo];
    const etiquetaB = b.motivo === "SIN_MOTIVO" ? "Sin motivo" : LABEL_MOTIVO[b.motivo];
    return etiquetaA !== etiquetaB ? etiquetaA.localeCompare(etiquetaB) : a.numeroEconomico.localeCompare(b.numeroEconomico);
  });
  return `
    <div style="margin-bottom:16px;">
      ${seccionTitulo(`UNIDADES NO DISPONIBLES — DETALLE (${filas.length})`)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff; border:1px solid ${BORDER}; border-radius:8px; border-collapse:collapse; font-size:11px;">
        <tr style="background:${SURFACE};">
          <td style="padding:6px 12px; font-size:9px; font-weight:bold; color:${SLATE}; border-bottom:1px solid ${BORDER};">ECONÓMICO</td>
          <td style="padding:6px 12px; font-size:9px; font-weight:bold; color:${SLATE}; border-bottom:1px solid ${BORDER};">VEHÍCULO</td>
          <td style="padding:6px 12px; font-size:9px; font-weight:bold; color:${SLATE}; border-bottom:1px solid ${BORDER};">TIPO</td>
          <td style="padding:6px 12px; font-size:9px; font-weight:bold; color:${SLATE}; border-bottom:1px solid ${BORDER};">MOTIVO</td>
        </tr>
        ${filas
          .map(
            (u) => `
          <tr>
            <td style="padding:5px 12px; font-weight:bold; color:${NAVY}; border-bottom:1px solid ${BORDER};">${esc(u.numeroEconomico)}</td>
            <td style="padding:5px 12px; color:${NAVY}; border-bottom:1px solid ${BORDER};">${esc(u.vehiculo ?? "—")}</td>
            <td style="padding:5px 12px; color:${NAVY}; border-bottom:1px solid ${BORDER};">${u.tipoVehiculo ? esc(TIPO_VEHICULO_LABEL[u.tipoVehiculo]) : "—"}</td>
            <td style="padding:5px 12px; color:${NAVY}; border-bottom:1px solid ${BORDER};">${esc(u.motivo === "SIN_MOTIVO" ? "Sin motivo" : LABEL_MOTIVO[u.motivo])}${u.motivoDetalle ? ` — ${esc(u.motivoDetalle)}` : ""}</td>
          </tr>`
          )
          .join("")}
      </table>
    </div>`;
}

function tablaFlotaPorProyecto(datos: FlotaProyecto[]): string {
  if (datos.length === 0) return "";
  const tiposPresentes = TIPOS_VEHICULO_ORDEN.filter((t) => datos.some((p) => (p.porTipo[t] ?? 0) > 0));
  const totalGeneral = datos.reduce((acc, p) => acc + p.total, 0);
  return `
    <div style="margin-bottom:16px;">
      ${seccionTitulo(`FLOTA POR PROYECTO (${totalGeneral} unidades activas)`)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff; border:1px solid ${BORDER}; border-radius:8px; border-collapse:collapse; font-size:11px;">
        <tr style="background:${SURFACE};">
          <td style="padding:6px 12px; font-size:9px; font-weight:bold; color:${SLATE}; border-bottom:1px solid ${BORDER};">PROYECTO</td>
          ${tiposPresentes.map((t) => `<td align="right" style="padding:6px 12px; font-size:9px; font-weight:bold; color:${SLATE}; border-bottom:1px solid ${BORDER};">${esc(TIPO_VEHICULO_LABEL[t].toUpperCase())}</td>`).join("")}
          <td align="right" style="padding:6px 12px; font-size:9px; font-weight:bold; color:${SLATE}; border-bottom:1px solid ${BORDER};">TOTAL</td>
        </tr>
        ${datos
          .map(
            (p) => `
          <tr>
            <td style="padding:5px 12px; color:${NAVY}; border-bottom:1px solid ${BORDER};">${esc(p.proyecto)}</td>
            ${tiposPresentes.map((t) => `<td align="right" style="padding:5px 12px; color:${NAVY}; border-bottom:1px solid ${BORDER};">${p.porTipo[t] ?? 0}</td>`).join("")}
            <td align="right" style="padding:5px 12px; font-weight:bold; color:${NAVY}; border-bottom:1px solid ${BORDER};">${p.total}</td>
          </tr>`
          )
          .join("")}
      </table>
    </div>`;
}

function listaProximosServicios(datos: EstatusFlota): string {
  if (datos.proximosServicios.length === 0) {
    return `<div style="font-size:11px; color:${SLATE}; font-style:italic;">Sin mantenimiento programado</div>`;
  }
  const MAX_MOSTRAR = 10;
  const filas = datos.proximosServicios.slice(0, MAX_MOSTRAR);
  const restantes = datos.proximosServicios.length - filas.length;
  const abrev: Record<string, string> = { MANTENIMIENTO_PREVENTIVO: "Prev", MANTENIMIENTO_CORRECTIVO: "Corr" };
  return `
    ${filas
      .map((f) => `<div style="font-size:11px; color:${NAVY}; margin-bottom:4px;">• ${esc(f.numeroEconomico)} (${esc(abrev[f.categoria] ?? CATEGORIA_GASTO_LABEL[f.categoria] ?? f.categoria)}) - ${esc(fmtFechaCorta(f.fecha))}</div>`)
      .join("")}
    ${restantes > 0 ? `<div style="font-size:11px; color:${SLATE}; font-style:italic;">+ ${restantes} más</div>` : ""}`;
}

/** Bloque completo (todas las secciones, en el orden elegido) para un alcance — general, selección combinada, o un proyecto individual. */
function bloqueEstatus(datos: EstatusFlota, indicadoresDashboard: IndicadorDashboard[] | undefined, ordenSecciones: SeccionReporteId[]): string {
  const pctPresupuesto = datos.presupuestoMes.asignado > 0 ? Math.round((datos.gastoTotal / datos.presupuestoMes.asignado) * 100) : 0;
  const totalDisp = datos.unidadesDisponibles + datos.unidadesNoDisponibles;
  const pctDisp = totalDisp > 0 ? Math.round((datos.unidadesDisponibles / totalDisp) * 1000) / 10 : 0;

  const secciones: Record<SeccionReporteId, () => string> = {
    indicadoresDashboard: () =>
      indicadoresDashboard && indicadoresDashboard.length > 0
        ? Array.from({ length: Math.ceil(indicadoresDashboard.length / 3) })
            .map((_, i) => filaTarjetas(indicadoresDashboard.slice(i * 3, i * 3 + 3).map((ind) => tarjeta(ind.title, kpi(esc(ind.value))))))
            .join("")
        : "",

    resumen: () =>
      filaTarjetas([
        tarjeta("SLA promedio", kpi(datos.slaPromedio !== null ? `${datos.slaPromedio}%` : "—", "Disponibilidad ponderada del periodo")),
        tarjeta("Unidades", kpi(String(datos.totalUnidades), `${datos.unidadesDisponibles} disponibles · ${datos.unidadesNoDisponibles} no disponibles`)),
        tarjeta("Actividad checklists", kpi(String(datos.checklistsPromedioDiario), "promedio por día")),
      ]),

    disponibilidadGasto: () =>
      filaTarjetas([
        tarjeta(
          "Disponibilidad",
          `<div style="font-size:20px; font-weight:bold; color:${totalDisp > 0 ? GREEN : SLATE};">${totalDisp > 0 ? `${pctDisp}%` : "—"}</div>
           <div style="font-size:11px; color:${SLATE}; margin-top:4px;">
             <span style="color:${GREEN};">●</span> Disp. (${datos.unidadesDisponibles}) &nbsp; <span style="color:${RED};">●</span> No disp. (${datos.unidadesNoDisponibles})
           </div>`
        ),
        tarjeta(
          "Gasto vs. presupuesto",
          `${kpi(esc(fmtMoney(datos.gastoTotal)))}
           <div style="background:${SURFACE}; border-radius:4px; height:7px; overflow:hidden; margin-top:10px;">
             <div style="background:${pctPresupuesto > 90 ? RED : BLUE}; width:${Math.min(100, pctPresupuesto)}%; height:7px;"></div>
           </div>
           <div style="font-size:11px; color:${SLATE}; margin-top:4px;">Mes: ${esc(fmtMoney(datos.presupuestoMes.asignado))} · ${pctPresupuesto}%</div>`
        ),
        tarjeta("Desglose de gastos", barrasHorizontal(datos.gastoPorCategoria.map((g) => ({ label: CATEGORIA_GASTO_LABEL[g.categoria] ?? g.categoria, valor: g.monto })), "Sin gastos registrados en el periodo.", (v) => fmtMoney(v))),
      ]),

    flotaPorProyecto: () => tablaFlotaPorProyecto(datos.flotaPorProyecto),

    proximosServicios: () => filaTarjetas([tarjeta("Próximos servicios (7 días)", listaProximosServicios(datos))]),

    unidadesNoDisponibles: () => tablaUnidadesNoDisponibles(datos),

    datosAdicionales: () =>
      datos.camposExtra.length > 0
        ? Array.from({ length: Math.ceil(datos.camposExtra.length / 3) })
            .map((_, i) =>
              filaTarjetas(
                datos.camposExtra.slice(i * 3, i * 3 + 3).map((c) =>
                  c.tipoVisualizacion === "kpi"
                    ? tarjeta(c.campoLabel, kpi((c.valorKpi ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 2 }), `Suma total · ${c.datasetLabel}`))
                    : tarjeta(c.campoLabel, barrasHorizontal((c.filas ?? []).map((f) => ({ label: f.label, valor: f.valor })), "Sin datos.", (v) => String(v)))
                )
              )
            )
            .join("")
        : "",
  };

  return `
    <div style="margin-bottom:24px;">
      <div style="background:${NAVY}; border-radius:8px; border-left:4px solid ${BLUE}; padding:14px 18px; margin-bottom:14px;">
        <div style="font-size:16px; font-weight:bold; color:#ffffff;">${esc(datos.proyectoLabel)}</div>
        <div style="font-size:10px; color:#a8b4c8; margin-top:3px; letter-spacing:0.3px;">ESTATUS DE FLOTA · ${esc(fmtFechaHtml(datos.desde).toUpperCase())} — ${esc(fmtFechaHtml(datos.hasta).toUpperCase())}</div>
      </div>
      ${ordenSecciones.map((id) => secciones[id]()).join("")}
    </div>`;
}

/**
 * Cuerpo HTML completo del correo de "Estatus de flota" — un bloque por
 * alcance (general, selección combinada, cada proyecto), mismo contenido y
 * orden de secciones que la versión PDF de descarga (EstatusFlotaDocument).
 * Reemplaza al adjunto PDF en el envío por correo (manual y programado).
 */
export function generarEstatusFlotaHtml(
  datos: EstatusFlotaReporte,
  indicadoresDashboard?: IndicadorDashboard[],
  ordenSecciones: SeccionReporteId[] = ORDEN_SECCIONES_DEFAULT
): string {
  const bloques = [
    bloqueEstatus(datos.general, indicadoresDashboard, ordenSecciones),
    datos.seleccion ? bloqueEstatus(datos.seleccion, undefined, ordenSecciones) : "",
    ...datos.porProyecto.map((p) => bloqueEstatus(p, undefined, ordenSecciones)),
  ].join("");

  const rangoGeneral = `${fmtFechaHtml(datos.desde).toUpperCase()} — ${fmtFechaHtml(datos.hasta).toUpperCase()}`;
  const fechaGeneracion = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0; padding:0; background:#f4f6f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9; padding:24px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px; width:100%;">
            <tr>
              <td style="padding-bottom:16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${NAVY}; background-image:linear-gradient(135deg, ${NAVY} 0%, #16294a 55%, #1c3f78 100%); border-radius:14px; overflow:hidden;">
                  <tr>
                    <td style="padding:26px 28px; border-top:4px solid ${BLUE};">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle">
                            <div style="font-family:Georgia,serif; font-size:26px; font-weight:800; color:#ffffff; letter-spacing:0.3px;">Orión</div>
                            <div style="font-size:11px; color:#a8b4c8; margin-top:2px; letter-spacing:0.4px;">CONTROL VEHICULAR · GRUPO KABAT</div>
                          </td>
                          <td align="right" valign="middle" width="90">
                            <img src="${KABAT_LOGO_DATA_URI}" width="72" height="49" alt="Grupo Kabat" style="display:block; width:72px; height:49px; object-fit:contain;" />
                          </td>
                        </tr>
                      </table>
                      <div style="height:1px; background:rgba(255,255,255,0.12); margin:18px 0 16px 0;"></div>
                      <div style="font-size:19px; font-weight:bold; color:#ffffff;">Reporte semanal de flota</div>
                      <div style="font-size:11.5px; color:#c3cee2; margin-top:5px;">Periodo ${esc(rangoGeneral)} · Generado el ${esc(fechaGeneracion)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>${bloques}</td>
            </tr>
            <tr>
              <td style="padding:12px 0; text-align:center; font-size:10px; color:${SLATE}; border-top:1px solid ${BORDER};">
                Reporte generado automáticamente por Orión · Control Vehicular — Grupo Kabat
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
