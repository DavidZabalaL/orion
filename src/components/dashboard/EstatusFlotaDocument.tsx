import type { ReactNode } from "react";
import { formatearValorBI, formatearCeldaBI } from "@/lib/bi/formato-valor";
import type { VistaDashboardReporte, WidgetReporte } from "@/lib/reportes/vista-dashboard-reporte";
import { Document, Page, Text, View, StyleSheet, Svg, Circle, Image } from "@react-pdf/renderer";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import {
  LABEL_MOTIVO,
  TIPO_SINIESTRO_LABEL,
  ESTATUS_SINIESTRO_LABEL,
  ESTATUS_GASTO_LABEL,
} from "@/lib/reportes/estatus-flota-labels";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { KABAT_LOGO_DATA_URI } from "@/components/dashboard/kabat-logo-base64";
import type { EstatusFlota, EstatusFlotaReporte, FlotaProyecto, ApoyoReporteItem } from "@/lib/reportes/estatus-flota";
import type { TipoVehiculo, CategoriaGasto } from "@/generated/prisma/enums";
import { ORDEN_SECCIONES_DEFAULT, type SeccionReporteId } from "@/lib/reportes/estatus-flota-secciones";
import { AGRUPACION_TEMPORAL_LABEL } from "@/lib/reportes/campos-extra-tipos";
import { colorParaValor, promedioDe, type ReglaColorColumna } from "@/lib/bi/reglas-color";

// Paleta Grupo Kabat — mismo azul/marino que el resto de la plataforma
// (var(--color-primary) / sidebar oscuro), reproducida en hex fijo porque
// @react-pdf/renderer no resuelve variables CSS.
const NAVY = "#0f1b2d";
const BLUE = "#2b7fff";
const GREEN = "#22c55e";
const RED = "#ef4444";
const SLATE = "#6b7785";
const BORDER = "#e8ecef";
const SURFACE = "#f6f9fc";
const PAGE_BG = "#f4f6fb";
const PALETA_BARRAS = ["#f59e0b", "#22c55e", "#6366f1", "#38bdf8", "#ef4444", "#a855f7", "#14b8a6", "#f43f5e"];

const CATEGORIA_MANTENIMIENTO_ABREV: Record<string, string> = {
  MANTENIMIENTO_PREVENTIVO: "Prev",
  MANTENIMIENTO_CORRECTIVO: "Corr",
};

const styles = StyleSheet.create({
  page: { fontSize: 9.5, fontFamily: "Helvetica", color: NAVY, backgroundColor: PAGE_BG, padding: 24 },

  headerCard: {
    backgroundColor: NAVY, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: BLUE,
    paddingVertical: 14, paddingHorizontal: 18, marginBottom: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  headerTitulo: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  headerSubtitulo: { fontSize: 9, color: "#a8b4c8", marginTop: 3, letterSpacing: 0.3 },
  headerLogo: { width: 62, height: 42, objectFit: "contain" },

  fila: { flexDirection: "row", gap: 14, marginBottom: 14 },
  tarjeta: {
    flex: 1, backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: BORDER,
    padding: 14, minHeight: 96,
  },
  tarjetaTitulo: { fontSize: 8, fontWeight: "bold", color: SLATE, letterSpacing: 0.6, marginBottom: 10 },

  kpiValor: { fontSize: 22, fontWeight: "bold", color: NAVY },
  kpiCaption: { fontSize: 8.5, color: SLATE, marginTop: 4 },

  barraFondo: { height: 7, backgroundColor: SURFACE, borderRadius: 4, overflow: "hidden", marginTop: 10 },

  donaFila: { flexDirection: "row", alignItems: "center", gap: 12 },
  leyendaFila: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 },
  leyendaTexto: { fontSize: 8.5, color: NAVY },

  barraLabelFila: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 },
  barraLabelTexto: { width: 78, fontSize: 8, color: SLATE },
  barraTrack: { flex: 1, height: 9, backgroundColor: SURFACE, borderRadius: 3, overflow: "hidden" },
  barraValor: { width: 58, textAlign: "right", fontSize: 8.5, fontWeight: "bold", color: NAVY },

  listaItem: { fontSize: 8.5, color: NAVY, marginBottom: 5, lineHeight: 1.3 },
  listaVacio: { fontSize: 8.5, color: SLATE, fontStyle: "italic" },

  seccionTitulo: { fontSize: 9, fontWeight: "bold", color: NAVY, letterSpacing: 0.5, marginBottom: 8 },
  tablaContenedor: {
    backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: BORDER,
    marginBottom: 14, overflow: "hidden",
  },
  tablaHeaderFila: {
    flexDirection: "row", backgroundColor: SURFACE, paddingVertical: 6, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  tablaFila: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  tablaCeldaHeader: { fontSize: 7.5, fontWeight: "bold", color: SLATE, letterSpacing: 0.4 },
  tablaCeldaTexto: { fontSize: 8.5, color: NAVY },

  footer: {
    position: "absolute", bottom: 14, left: 24, right: 24, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: BORDER, flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: SLATE },
});

const TARJETAS_POR_FILA = 3;

/** Divide una lista en grupos de `tamano` — cada grupo se renderiza como su propia fila, así ninguna fila termina con más tarjetas de las que caben en el ancho de la página. */
function enGrupos<T>(lista: T[], tamano: number): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) grupos.push(lista.slice(i, i + tamano));
  return grupos;
}

function fmtMoneyPdf(valor: number): string {
  return `$${Math.round(valor).toLocaleString("es-MX")}`;
}

function fmtFechaPdf(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric", timeZone: "America/Mexico_City" }).replace(".", "");
}

function fmtFechaCorta(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { month: "short", day: "numeric", timeZone: "America/Mexico_City" }).replace(".", "");
}

function Tarjeta({ titulo, children, flexBasis }: { titulo: string; children: React.ReactNode; flexBasis?: number }) {
  return (
    <View style={flexBasis ? { ...styles.tarjeta, flex: flexBasis } : styles.tarjeta}>
      <Text style={styles.tarjetaTitulo}>{titulo.toUpperCase()}</Text>
      {children}
    </View>
  );
}

/** Dona de disponibilidad — dibujada con dos arcos SVG (sin dependencias de rasterizado, corre igual en servidor que en el navegador). */
function DonaDisponibilidad({ disponibles, noDisponibles }: { disponibles: number; noDisponibles: number }) {
  const total = disponibles + noDisponibles;
  const pct = total > 0 ? Math.round((disponibles / total) * 1000) / 10 : 0;
  const size = 76;
  const grosor = 12;
  const radio = (size - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const largoDisponible = total > 0 ? (disponibles / total) * circunferencia : 0;
  const centro = size / 2;

  return (
    <View style={styles.donaFila}>
      <View style={{ width: size, height: size, position: "relative" }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={centro} cy={centro} r={radio} stroke={total > 0 ? RED : BORDER} strokeWidth={grosor} fill="none" />
          {total > 0 && (
            <Circle
              cx={centro}
              cy={centro}
              r={radio}
              stroke={GREEN}
              strokeWidth={grosor}
              fill="none"
              strokeDasharray={`${largoDisponible} ${circunferencia}`}
              transform={`rotate(-90 ${centro} ${centro})`}
            />
          )}
        </Svg>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 13, fontWeight: "bold", color: NAVY }}>{total > 0 ? `${pct}%` : "—"}</Text>
        </View>
      </View>
      <View>
        <View style={styles.leyendaFila}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN }} />
          <Text style={styles.leyendaTexto}>Disp. ({disponibles})</Text>
        </View>
        <View style={styles.leyendaFila}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RED }} />
          <Text style={styles.leyendaTexto}>No disp. ({noDisponibles})</Text>
        </View>
      </View>
    </View>
  );
}

function BarraHorizontal({ label, valor, max, color, formatear }: { label: string; valor: number; max: number; color: string; formatear: (v: number) => string }) {
  const pct = max > 0 ? Math.max(2, Math.round((valor / max) * 100)) : 0;
  return (
    <View style={styles.barraLabelFila}>
      <Text style={styles.barraLabelTexto}>{label}</Text>
      <View style={styles.barraTrack}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color }} />
      </View>
      <Text style={styles.barraValor}>{formatear(valor)}</Text>
    </View>
  );
}

function TarjetaBarras({ titulo, filas, vacio, formatear = (v: number) => String(v), reglasColor, pie }: { titulo: string; filas: { label: string; valor: number }[]; vacio: string; formatear?: (v: number) => string; reglasColor?: ReglaColorColumna[]; pie?: string }) {
  if (filas.length === 0) {
    return (
      <Tarjeta titulo={titulo}>
        <Text style={styles.listaVacio}>{vacio}</Text>
      </Tarjeta>
    );
  }
  const max = Math.max(...filas.map((f) => f.valor));
  const promedio = promedioDe(filas.map((f) => f.valor));
  return (
    <Tarjeta titulo={titulo}>
      {filas.map((f, i) => (
        <BarraHorizontal key={f.label} label={f.label} valor={f.valor} max={max} color={colorParaValor(f.valor, f.label, reglasColor, promedio) ?? PALETA_BARRAS[i % PALETA_BARRAS.length]} formatear={formatear} />
      ))}
      {pie && <Text style={{ ...styles.kpiCaption, marginTop: 6 }}>{pie}</Text>}
    </Tarjeta>
  );
}

/** "General" es la etiqueta interna del alcance sin restricción de proyecto — se muestra como "Todos los proyectos", más claro para quien lee el reporte. */
function etiquetaAlcance(proyectoLabel: string): string {
  return proyectoLabel === "General" ? "Todos los proyectos" : proyectoLabel;
}

/**
 * true si algún indicador del dashboard (snapshot de "Mis dashboards" al
 * momento del envío, ej. "Enviar ahora") ya cubre este concepto — en ese
 * caso la tarjeta equivalente del resumen del reporte se omite para no
 * mostrar el mismo dato dos veces con cifras potencialmente distintas (una
 * es snapshot actual, la otra es el cálculo propio del periodo del reporte).
 */
function cubiertoPorDashboard(indicadoresDashboard: IndicadorDashboard[] | undefined, ...palabrasClave: string[]): boolean {
  if (!indicadoresDashboard || indicadoresDashboard.length === 0) return false;
  const titulos = indicadoresDashboard.map((i) => i.title.toLowerCase());
  return palabrasClave.some((p) => titulos.some((t) => t.includes(p)));
}

function TarjetaKpi({ titulo, valor, caption, campoLabel, reglasColor, sufijo }: { titulo: string; valor: number; caption: string; campoLabel: string; reglasColor?: ReglaColorColumna[]; sufijo?: string }) {
  const color = colorParaValor(valor, campoLabel, reglasColor);
  return (
    <Tarjeta titulo={titulo}>
      <Text style={color ? { ...styles.kpiValor, color } : styles.kpiValor}>{formatearValorBI(valor, sufijo)}</Text>
      <Text style={styles.kpiCaption}>{caption}</Text>
    </Tarjeta>
  );
}

function SubtablaGastoPorPartida({ titulo, categorias, total }: { titulo: string; categorias: { categoria: CategoriaGasto; monto: number }[]; total: number }) {
  if (categorias.length === 0) {
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 8.5, fontWeight: "bold", color: SLATE, marginBottom: 3 }}>{titulo}</Text>
        <Text style={{ fontSize: 9.5, color: SLATE, fontStyle: "italic" }}>Sin gastos registrados.</Text>
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 8.5, fontWeight: "bold", color: SLATE, marginBottom: 3 }}>{titulo}</Text>
      <View style={styles.tablaContenedor}>
        <View style={styles.tablaHeaderFila}>
          <Text style={{ ...styles.tablaCeldaHeader, flex: 1 }}>PARTIDA</Text>
          <Text style={{ ...styles.tablaCeldaHeader, width: 90, textAlign: "right" }}>MONTO</Text>
        </View>
        {categorias.map((g) => (
          <View key={g.categoria} style={styles.tablaFila}>
            <Text style={{ ...styles.tablaCeldaTexto, flex: 1 }}>{CATEGORIA_GASTO_LABEL[g.categoria] ?? g.categoria}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, width: 90, textAlign: "right" }}>{fmtMoneyPdf(g.monto)}</Text>
          </View>
        ))}
        <View style={styles.tablaFila}>
          <Text style={{ ...styles.tablaCeldaTexto, flex: 1, fontWeight: "bold" }}>Total</Text>
          <Text style={{ ...styles.tablaCeldaTexto, width: 90, textAlign: "right", fontWeight: "bold" }}>{fmtMoneyPdf(total)}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Siempre muestra TRES desgloses, claramente rotulados: el del periodo que
 * cubre este reporte (puede ser 7/15/30/60/90 días), el del mes en curso y el acumulado anual —
 * se pidió explícitamente no mostrar solo uno, para no confundir "gasto del
 * periodo" con "gasto del mes" cuando el periodo configurado no es el mes completo.
 */
function TablaGastoPorPartida({ datos }: { datos: EstatusFlota }) {
  if (datos.gastoPorCategoria.length === 0 && datos.gastoPorCategoriaMes.length === 0 && datos.gastoPorCategoriaAnio.length === 0) return null;
  const nombreMes = datos.hasta.toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "America/Mexico_City" });
  return (
    <View>
      <Text style={styles.seccionTitulo}>GASTO DEL PROYECTO POR PARTIDA</Text>
      <SubtablaGastoPorPartida
        titulo={`DEL PERIODO (${fmtFechaCorta(datos.desde)} – ${fmtFechaCorta(datos.hasta)})`}
        categorias={datos.gastoPorCategoria}
        total={datos.gastoTotal}
      />
      <SubtablaGastoPorPartida
        titulo={`MES EN CURSO (${nombreMes.toUpperCase()}, AL ${fmtFechaCorta(datos.hasta)})`}
        categorias={datos.gastoPorCategoriaMes}
        total={datos.gastoTotalMes}
      />
      <SubtablaGastoPorPartida
        titulo={`ACUMULADO ANUAL (1 ENE – ${fmtFechaCorta(datos.hasta)})`}
        categorias={datos.gastoPorCategoriaAnio}
        total={datos.gastoAcumuladoAnio}
      />
    </View>
  );
}

/**
 * Detalle completo (sin truncar) de cada unidad no disponible — económico,
 * vehículo (marca + modelo), proyecto y motivo. Se pidió explícitamente poder
 * ver el número económico de cada una, y de ser posible qué vehículo es — antes
 * esta sección solo mostraba un conteo agrupado con máximo 6 económicos por
 * motivo. Es una sección propia a ancho completo (no una tarjeta de la fila
 * de 3 columnas) porque la lista puede ser larga; al no llevar `wrap={false}`
 * fluye a la siguiente página sola si no cabe completa.
 */

function TablaUnidadesNoDisponibles({ datos }: { datos: EstatusFlota }) {
  if (datos.indisponibilidadDetalle.length === 0) return <TablaGastoPorPartida datos={datos} />;
  const filas = [...datos.indisponibilidadDetalle].sort((a, b) => {
    const etiquetaA = a.motivo === "SIN_MOTIVO" ? "Sin motivo" : LABEL_MOTIVO[a.motivo];
    const etiquetaB = b.motivo === "SIN_MOTIVO" ? "Sin motivo" : LABEL_MOTIVO[b.motivo];
    return etiquetaA !== etiquetaB ? etiquetaA.localeCompare(etiquetaB) : a.numeroEconomico.localeCompare(b.numeroEconomico);
  });
  return (
    <View>
      <Text style={styles.seccionTitulo}>UNIDADES NO DISPONIBLES — DETALLE ({filas.length})</Text>
      <View style={styles.tablaContenedor}>
        <View style={styles.tablaHeaderFila}>
          <Text style={{ ...styles.tablaCeldaHeader, width: 55 }}>ECONÓMICO</Text>
          <Text style={{ ...styles.tablaCeldaHeader, width: 130, paddingRight: 6 }}>VEHÍCULO</Text>
          <Text style={{ ...styles.tablaCeldaHeader, width: 55 }}>TIPO</Text>
          <Text style={{ ...styles.tablaCeldaHeader, width: 100 }}>PROYECTO</Text>
          <Text style={{ ...styles.tablaCeldaHeader, width: 85 }}>MOTIVO</Text>
          <Text style={{ ...styles.tablaCeldaHeader, flex: 1 }}>DESCRIPCIÓN</Text>
          <Text style={{ ...styles.tablaCeldaHeader, width: 55 }}>INGRESO</Text>
          <Text style={{ ...styles.tablaCeldaHeader, width: 55 }}>SALIDA EST.</Text>
          <Text style={{ ...styles.tablaCeldaHeader, width: 60, textAlign: "right" }}>GASTO</Text>
        </View>
        {filas.map((u, i) => (
          <View key={`${u.numeroEconomico}-${i}`} style={styles.tablaFila}>
            <Text style={{ ...styles.tablaCeldaTexto, width: 55, fontWeight: "bold" }}>{u.numeroEconomico}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, width: 130, paddingRight: 6 }}>{u.vehiculo ?? "—"}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, width: 55 }}>{u.tipoVehiculo ? TIPO_VEHICULO_LABEL[u.tipoVehiculo] : "—"}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, width: 100 }}>{u.proyecto ?? "—"}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, width: 85 }}>{u.motivo === "SIN_MOTIVO" ? "Sin motivo" : LABEL_MOTIVO[u.motivo]}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, flex: 1 }}>{u.motivoDetalle ?? "—"}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, width: 55 }}>{u.fechaIngresoTaller ? fmtFechaCorta(u.fechaIngresoTaller) : "—"}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, width: 55 }}>{u.fechaEstimadaSalida ? fmtFechaCorta(u.fechaEstimadaSalida) : "—"}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, width: 60, textAlign: "right" }}>{u.costoMantenimiento !== null ? fmtMoneyPdf(u.costoMantenimiento) : "—"}</Text>
          </View>
        ))}
      </View>
      <TablaGastoPorPartida datos={datos} />
    </View>
  );
}

const TIPOS_VEHICULO_ORDEN: TipoVehiculo[] = ["CAMIONETA", "GRUA", "AUTO", "MOTO", "OTRO"];

/**
 * Flota activa desglosada por proyecto y tipo de vehículo — mismo criterio
 * que el widget "Flota por tipo y zona" del dashboard. Se pidió explícitamente
 * ("sí o sí") que el reporte incluya este desglose por proyecto.
 */
function TablaFlotaPorProyecto({ datos }: { datos: FlotaProyecto[] }) {
  if (datos.length === 0) return null;
  const tiposPresentes = TIPOS_VEHICULO_ORDEN.filter((t) => datos.some((p) => (p.porTipo[t] ?? 0) > 0));
  const totalGeneral = datos.reduce((acc, p) => acc + p.total, 0);
  return (
    <View>
      <Text style={styles.seccionTitulo}>FLOTA POR PROYECTO ({totalGeneral} unidades activas)</Text>
      <View style={styles.tablaContenedor}>
        <View style={styles.tablaHeaderFila}>
          <Text style={{ ...styles.tablaCeldaHeader, width: 220 }}>PROYECTO</Text>
          {tiposPresentes.map((t) => (
            <Text key={t} style={{ ...styles.tablaCeldaHeader, width: 75, textAlign: "right" }}>{TIPO_VEHICULO_LABEL[t].toUpperCase()}</Text>
          ))}
          <Text style={{ ...styles.tablaCeldaHeader, width: 75, textAlign: "right" }}>TOTAL</Text>
        </View>
        {datos.map((p) => (
          <View key={p.proyecto} style={styles.tablaFila}>
            <Text style={{ ...styles.tablaCeldaTexto, width: 220 }}>{p.proyecto}</Text>
            {tiposPresentes.map((t) => (
              <Text key={t} style={{ ...styles.tablaCeldaTexto, width: 75, textAlign: "right" }}>{p.porTipo[t] ?? 0}</Text>
            ))}
            <Text style={{ ...styles.tablaCeldaTexto, width: 75, textAlign: "right", fontWeight: "bold" }}>{p.total}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ListaProximosServicios({ datos }: { datos: EstatusFlota }) {
  if (datos.proximosServicios.length === 0) {
    return <Text style={styles.listaVacio}>Sin mantenimiento programado</Text>;
  }
  const MAX_MOSTRAR = 10;
  const filas = datos.proximosServicios.slice(0, MAX_MOSTRAR);
  const restantes = datos.proximosServicios.length - filas.length;
  return (
    <>
      {filas.map((f, i) => (
        <Text key={`${f.numeroEconomico}-${i}`} style={styles.listaItem}>
          • {f.numeroEconomico}{f.proyecto ? ` (${f.proyecto})` : ""} — {CATEGORIA_MANTENIMIENTO_ABREV[f.categoria] ?? CATEGORIA_GASTO_LABEL[f.categoria]} - {fmtFechaCorta(f.fecha)}
        </Text>
      ))}
      {restantes > 0 && <Text style={styles.listaVacio}>+ {restantes} más</Text>}
    </>
  );
}

/**
 * Los mismos indicadores que muestra el widget "Contador" del dashboard
 * (título + valor tal cual se ve en pantalla) — se pasan solo para la página
 * "General" cuando el reporte se genera desde el dashboard (ver
 * EstatusFlotaModal), para que el PDF nunca diga un número distinto al que
 * la persona tenía enfrente al pedirlo. En el envío automático programado no
 * hay dashboard abierto, así que esta sección simplemente no aparece.
 */
export type IndicadorDashboard = { title: string; value: string };

function TarjetaIndicadorDashboard({ indicador }: { indicador: IndicadorDashboard }) {
  return (
    <Tarjeta titulo={indicador.title}>
      <Text style={styles.kpiValor}>{indicador.value}</Text>
    </Tarjeta>
  );
}

function TablaSiniestros({ datos }: { datos: EstatusFlota }) {
  const filas = datos.siniestrosDetalle;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.seccionTitulo}>
        SINIESTROS ({datos.siniestrosPeriodo} en el periodo · {datos.siniestrosAcumuladoAnio} acumulados en el año)
      </Text>
      {filas.length === 0 ? (
        <View style={{ ...styles.tablaContenedor, padding: 12 }}>
          <Text style={styles.listaVacio}>Sin siniestros registrados en el periodo.</Text>
        </View>
      ) : (
        <View style={styles.tablaContenedor}>
          <View style={styles.tablaHeaderFila}>
            <Text style={{ ...styles.tablaCeldaHeader, width: 85 }}>FOLIO</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 55 }}>FECHA</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 110 }}>UNIDAD</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 90 }}>PROYECTO</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 80 }}>TIPO</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 75 }}>ESTATUS</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 70, textAlign: "right" }}>COSTO/EST.</Text>
            <Text style={{ ...styles.tablaCeldaHeader, flex: 1 }}>DESCRIPCIÓN</Text>
          </View>
          {filas.map((s, i) => (
            <View key={`${s.id}-${i}`} style={styles.tablaFila}>
              <Text style={{ ...styles.tablaCeldaTexto, width: 85, fontWeight: "bold" }}>{s.folio}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 55 }}>{fmtFechaCorta(s.fecha)}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 110 }}>{s.numeroEconomico}{s.vehiculo ? ` (${s.vehiculo})` : ""}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 90 }}>{s.proyecto ?? "—"}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 80 }}>{TIPO_SINIESTRO_LABEL[s.tipo] ?? s.tipo}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 75 }}>{ESTATUS_SINIESTRO_LABEL[s.estatus] ?? s.estatus}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 70, textAlign: "right" }}>{s.costo !== null ? fmtMoneyPdf(s.costo) : "—"}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, flex: 1 }}>{s.descripcion}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SubtablaApoyoPdf({ titulo, items, totalMonto }: { titulo: string; items: ApoyoReporteItem[]; totalMonto: number }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ ...styles.seccionTitulo, fontSize: 8.5 }}>
        {titulo} ({items.length} solicitudes · {fmtMoneyPdf(totalMonto)})
      </Text>
      {items.length === 0 ? (
        <View style={{ ...styles.tablaContenedor, padding: 12 }}>
          <Text style={styles.listaVacio}>Sin solicitudes registradas.</Text>
        </View>
      ) : (
        <View style={styles.tablaContenedor}>
          <View style={styles.tablaHeaderFila}>
            <Text style={{ ...styles.tablaCeldaHeader, width: 55 }}>FECHA</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 55 }}>UNIDAD</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 90 }}>PROYECTO</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 130 }}>CONCEPTO</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 130 }}>PROVEEDOR</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 85 }}>ESTATUS</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 75 }}>ODC / SC</Text>
            <Text style={{ ...styles.tablaCeldaHeader, width: 70, textAlign: "right" }}>IMPORTE</Text>
          </View>
          {items.map((a, i) => (
            <View key={`${a.id}-${i}`} style={styles.tablaFila}>
              <Text style={{ ...styles.tablaCeldaTexto, width: 55 }}>{fmtFechaCorta(a.fecha)}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 55, fontWeight: "bold" }}>{a.numeroEconomico ?? "—"}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 90 }}>{a.proyecto ?? "—"}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 130 }}>{a.descripcion ?? a.servicio ?? CATEGORIA_GASTO_LABEL[a.categoria] ?? a.categoria}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 130 }}>{a.proveedor ?? "—"}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 85 }}>{ESTATUS_GASTO_LABEL[a.estatus] ?? a.estatus}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 75 }}>{[a.odc ? `ODC: ${a.odc}` : null, a.sc ? `SC: ${a.sc}` : null].filter(Boolean).join(" · ") || "—"}</Text>
              <Text style={{ ...styles.tablaCeldaTexto, width: 70, textAlign: "right", fontWeight: "bold" }}>{fmtMoneyPdf(a.costo)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function TablaApoyosComprasFinanzas({ datos }: { datos: EstatusFlota }) {
  const totalGeneral = datos.totalApoyosCompras + datos.totalApoyosFinanzas + datos.apoyosOtros.reduce((acc, a) => acc + a.costo, 0);
  const totalItems = datos.apoyosCompras.length + datos.apoyosFinanzas.length + datos.apoyosOtros.length;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.seccionTitulo}>
        APOYOS DE COMPRAS Y FINANZAS ({totalItems} solicitudes · {fmtMoneyPdf(totalGeneral)})
      </Text>
      <SubtablaApoyoPdf titulo="APOYOS DE COMPRAS" items={datos.apoyosCompras} totalMonto={datos.totalApoyosCompras} />
      <SubtablaApoyoPdf titulo="APOYOS DE FINANZAS" items={datos.apoyosFinanzas} totalMonto={datos.totalApoyosFinanzas} />
      {datos.apoyosOtros.length > 0 && (
        <SubtablaApoyoPdf titulo="OTROS APOYOS" items={datos.apoyosOtros} totalMonto={datos.apoyosOtros.reduce((acc, a) => acc + a.costo, 0)} />
      )}
    </View>
  );
}

/** Una página del reporte para un alcance específico (general, selección combinada, o un proyecto individual). */
function PaginaEstatus({
  datos,
  indicadoresDashboard,
  ordenSecciones = ORDEN_SECCIONES_DEFAULT,
}: {
  datos: EstatusFlota;
  indicadoresDashboard?: IndicadorDashboard[];
  ordenSecciones?: SeccionReporteId[];
}) {
  const pctPresupuesto = datos.presupuestoMes.asignado > 0 ? Math.round((datos.gastoTotal / datos.presupuestoMes.asignado) * 100) : 0;

  // Un renderer por sección — permite que quien configura el reporte
  // (EstatusFlotaModal) decida el orden en que aparecen, en vez de un orden
  // fijo en el código. Cada uno puede devolver `null` (ej. sin datos
  // adicionales elegidos) sin dejar un hueco visible.
  const seccionesDisponibles: Record<SeccionReporteId, () => React.ReactNode> = {
    indicadoresDashboard: () =>
      indicadoresDashboard && indicadoresDashboard.length > 0 ? (
        <>
          {enGrupos(indicadoresDashboard, TARJETAS_POR_FILA).map((grupo, i) => (
            <View key={`dash-${i}`} style={styles.fila} wrap={false}>
              {grupo.map((ind) => (
                <TarjetaIndicadorDashboard key={ind.title} indicador={ind} />
              ))}
              {grupo.length < TARJETAS_POR_FILA && Array.from({ length: TARJETAS_POR_FILA - grupo.length }).map((_, j) => (
                <View key={`dash-hueco-${j}`} style={{ flex: 1 }} />
              ))}
            </View>
          ))}
        </>
      ) : null,

    resumen: () => {
      const tarjetasResumen: ReactNode[] = [];
      if (!cubiertoPorDashboard(indicadoresDashboard, "sla"))
        tarjetasResumen.push(
          <Tarjeta key="sla" titulo="SLA promedio del periodo">
            <Text style={styles.kpiValor}>{datos.slaPromedio !== null ? `${datos.slaPromedio}%` : "—"}</Text>
            <Text style={styles.kpiCaption}>Disponibilidad ponderada del periodo</Text>
          </Tarjeta>
        );
      if (!cubiertoPorDashboard(indicadoresDashboard, "unidades"))
        tarjetasResumen.push(
          <Tarjeta key="unidades" titulo="Unidades">
            <Text style={styles.kpiValor}>{datos.totalUnidades}</Text>
            <Text style={styles.kpiCaption}>{datos.unidadesDisponibles} disponibles · {datos.unidadesNoDisponibles} no disponibles</Text>
          </Tarjeta>
        );
      tarjetasResumen.push(
        <Tarjeta key="siniestros" titulo="Siniestros">
          <Text style={styles.kpiValor}>{datos.siniestrosPeriodo}</Text>
          <Text style={styles.kpiCaption}>en el periodo · {datos.siniestrosAcumuladoAnio} acumulados en el año</Text>
        </Tarjeta>
      );
      if (!cubiertoPorDashboard(indicadoresDashboard, "checklist"))
        tarjetasResumen.push(
          <Tarjeta key="checklists" titulo="Actividad checklists del periodo">
            <Text style={styles.kpiValor}>{datos.checklistsPromedioDiario}</Text>
            <Text style={styles.kpiCaption}>promedio por día</Text>
          </Tarjeta>
        );
      if (!cubiertoPorDashboard(indicadoresDashboard, "no disponible"))
        tarjetasResumen.push(
          <Tarjeta key="no-disponibles" titulo="Total de unidades no disponibles">
            <Text style={styles.kpiValor}>{datos.unidadesNoDisponibles}</Text>
            <Text style={styles.kpiCaption}>de {datos.totalUnidades} unidades totales</Text>
          </Tarjeta>
        );

      // Presupuesto anualizado: Gasto acumulado en lo que va del año y en el mismo recuadro el valor presupuestado
      const pctPresupuestoAnual = datos.presupuestoAnual > 0 ? Math.round((datos.gastoAcumuladoAnio / datos.presupuestoAnual) * 100) : 0;
      tarjetasResumen.push(
        <Tarjeta key="presupuesto" titulo="Presupuesto anualizado">
          <Text style={styles.kpiValor}>{fmtMoneyPdf(datos.gastoAcumuladoAnio)}</Text>
          <Text style={{ ...styles.kpiCaption, fontWeight: "bold", fontSize: 6.5, textTransform: "uppercase", marginBottom: 2 }}>
            Acumulado en lo que va del año
          </Text>
          <View style={styles.barraFondo}>
            <View
              style={{
                width: `${Math.min(100, pctPresupuestoAnual)}%`,
                height: "100%",
                backgroundColor: pctPresupuestoAnual > 90 ? RED : BLUE,
              }}
            />
          </View>
          <Text style={{ ...styles.kpiCaption, marginTop: 3 }}>
            Presupuestado: {fmtMoneyPdf(datos.presupuestoAnual)}{datos.presupuestoAnual > 0 ? ` · ${pctPresupuestoAnual}% ejercido` : ""}
          </Text>
        </Tarjeta>
      );
      return enGrupos(tarjetasResumen, TARJETAS_POR_FILA).map((grupo, i) => (
        <View key={i} style={styles.fila} wrap={false}>
          {grupo}
          {grupo.length < TARJETAS_POR_FILA && Array.from({ length: TARJETAS_POR_FILA - grupo.length }).map((_, j) => (
            <View key={`resumen-hueco-${j}`} style={{ flex: 1 }} />
          ))}
        </View>
      ));
    },

    disponibilidadGasto: () => (
      <View style={styles.fila} wrap={false}>
        <Tarjeta titulo="Disponibilidad">
          <DonaDisponibilidad disponibles={datos.unidadesDisponibles} noDisponibles={datos.unidadesNoDisponibles} />
        </Tarjeta>
        <Tarjeta titulo="Gasto del periodo vs. presupuesto">
          <Text style={styles.kpiValor}>{fmtMoneyPdf(datos.gastoTotal)}</Text>
          <View style={styles.barraFondo}>
            <View style={{ width: `${Math.min(100, pctPresupuesto)}%`, height: "100%", backgroundColor: pctPresupuesto > 90 ? RED : BLUE }} />
          </View>
          <Text style={styles.kpiCaption}>Mes: {fmtMoneyPdf(datos.presupuestoMes.asignado)} · {pctPresupuesto}%</Text>
        </Tarjeta>
        <TarjetaBarras
          titulo="Desglose de gastos del periodo"
          vacio="Sin gastos registrados en el periodo."
          formatear={fmtMoneyPdf}
          filas={datos.gastoPorCategoria.map((g) => ({ label: CATEGORIA_GASTO_LABEL[g.categoria] ?? g.categoria, valor: g.monto }))}
        />
      </View>
    ),

    flotaPorProyecto: () => <TablaFlotaPorProyecto datos={datos.flotaPorProyecto} />,

    proximosServicios: () => (
      <View style={styles.fila} wrap={false}>
        <Tarjeta titulo="Próximos servicios (7 días)">
          <ListaProximosServicios datos={datos} />
        </Tarjeta>
        <View style={{ flex: 2 }} />
      </View>
    ),

    unidadesNoDisponibles: () => <TablaUnidadesNoDisponibles datos={datos} />,

    siniestros: () => <TablaSiniestros datos={datos} />,

    apoyosComprasFinanzas: () => <TablaApoyosComprasFinanzas datos={datos} />,

    datosAdicionales: () => {
      if (datos.camposExtra.length === 0) return null;
      const tarjetas: ReactNode[] = [];
      for (const c of datos.camposExtra) {
        const sufijoAgrupacion = c.agrupacionTemporal ? ` (${AGRUPACION_TEMPORAL_LABEL[c.agrupacionTemporal]})` : "";
        const detalleCampo = `${c.campoLabel} · ${etiquetaAlcance(datos.proyectoLabel)}`;
        const etiquetaPeriodo = c.periodoAcotado ? `Periodo: ${fmtFechaCorta(datos.desde)} – ${fmtFechaCorta(datos.hasta)}` : "Histórico, sin acotar";
        const tituloPeriodo = `${c.datasetLabel} del periodo${sufijoAgrupacion}`;
        tarjetas.push(
          c.tipoVisualizacion === "kpi" ? (
            <TarjetaKpi
              key={`${c.datasetId}.${c.campoId}`}
              titulo={tituloPeriodo}
              valor={c.valorKpi ?? 0}
              caption={`${detalleCampo} · ${etiquetaPeriodo}`}
              campoLabel={c.campoLabel}
              reglasColor={c.reglasColor}
              sufijo={c.sufijo}
            />
          ) : (
            <TarjetaBarras
              key={`${c.datasetId}.${c.campoId}`}
              titulo={tituloPeriodo}
              vacio="Sin datos."
              filas={(c.filas ?? []).map((f) => ({ label: f.label, valor: f.valor }))}
              formatear={(v) => formatearValorBI(v, c.sufijo)}
              reglasColor={c.reglasColor}
              pie={`${detalleCampo} · ${etiquetaPeriodo}`}
            />
          )
        );
        if (c.acumuladoAnio) {
          const tituloAnio = `${c.datasetLabel} — Acumulado anual`;
          const etiquetaAnio = `Acumulado ${c.acumuladoAnio.anio}: 1 ene – ${fmtFechaCorta(datos.hasta)}`;
          tarjetas.push(
            c.tipoVisualizacion === "kpi" ? (
              <TarjetaKpi
                key={`${c.datasetId}.${c.campoId}.anio`}
                titulo={tituloAnio}
                valor={c.acumuladoAnio.valorKpi ?? 0}
                caption={`${detalleCampo} · ${etiquetaAnio}`}
                campoLabel={c.campoLabel}
                reglasColor={c.reglasColor}
                sufijo={c.sufijo}
              />
            ) : (
              <TarjetaBarras
                key={`${c.datasetId}.${c.campoId}.anio`}
                titulo={tituloAnio}
                vacio="Sin datos."
                filas={(c.acumuladoAnio.filas ?? []).map((f) => ({ label: f.label, valor: f.valor }))}
                formatear={(v) => formatearValorBI(v, c.sufijo)}
                reglasColor={c.reglasColor}
                pie={`${detalleCampo} · ${etiquetaAnio}`}
              />
            )
          );
        }
      }
      return enGrupos(tarjetas, TARJETAS_POR_FILA).map((grupo, i) => (
        <View key={i} style={styles.fila} wrap={false}>
          {grupo}
          {/* Rellena huecos de la última fila incompleta para que las tarjetas no se estiren de más. */}
          {grupo.length < TARJETAS_POR_FILA && Array.from({ length: TARJETAS_POR_FILA - grupo.length }).map((_, j) => (
            <View key={`hueco-${j}`} style={{ flex: 1 }} />
          ))}
        </View>
      ));
    },
  };

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerTitulo}>{datos.proyectoLabel}</Text>
          <Text style={styles.headerSubtitulo}>
            ESTATUS DE FLOTA · {fmtFechaPdf(datos.desde).toUpperCase()} — {fmtFechaPdf(datos.hasta).toUpperCase()}
          </Text>
        </View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no <img> de HTML; no acepta `alt`. */}
        <Image src={KABAT_LOGO_DATA_URI} style={styles.headerLogo} />
      </View>

      {ordenSecciones.map((id) => (
        <View key={id}>{seccionesDisponibles[id]()}</View>
      ))}

      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>Orión · Control Vehicular — Grupo Kabat</Text>
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

/** Ancho útil (pt) de una gráfica en la página A4 horizontal: 842 − 2×24 de margen − 2×8 de la tarjeta. React-pdf necesita el alto explícito de la imagen; sale de su proporción real. */
const ANCHO_GRAFICA_PDF = 778;
/** Alto máximo (pt) para que la gráfica + su título quepan en una página (595 − márgenes, encabezado y pie): un bloque wrap={false} más alto que la página descuadra el resto del documento. */
const ALTO_MAX_GRAFICA_PDF = 470;

function tamanoGraficaPdf(ancho: number, alto: number): { width: number; height: number; alignSelf: "center" } {
  const altoAncho = (ANCHO_GRAFICA_PDF * alto) / ancho;
  return altoAncho <= ALTO_MAX_GRAFICA_PDF
    ? { width: ANCHO_GRAFICA_PDF, height: altoAncho, alignSelf: "center" }
    : { width: (ALTO_MAX_GRAFICA_PDF * ancho) / alto, height: ALTO_MAX_GRAFICA_PDF, alignSelf: "center" };
}

/** Tabla de un widget de la vista de dashboard incluida en el reporte. */
function TablaWidgetVista({ widget }: { widget: Extract<WidgetReporte, { tipo: "tabla" }> }) {
  return (
    <View style={{ marginBottom: 14 }} wrap={widget.filas.length > 15}>
      <Text style={styles.seccionTitulo}>{widget.titulo.toUpperCase()}</Text>
      <View style={styles.tablaContenedor}>
        <View style={styles.tablaHeaderFila} fixed>
          {widget.columnas.map((c, i) => (
            <Text key={i} style={{ ...styles.tablaCeldaHeader, flex: 1, paddingHorizontal: 4, textAlign: c.numerica ? "right" : "left" }}>{c.label.toUpperCase()}</Text>
          ))}
        </View>
        {widget.filas.length === 0 ? (
          <View style={styles.tablaFila}>
            <Text style={{ ...styles.tablaCeldaTexto, color: SLATE, fontStyle: "italic" }}>Sin registros.</Text>
          </View>
        ) : (
          widget.filas.map((fila, i) => (
            <View key={i} style={styles.tablaFila} wrap={false}>
              {fila.map((v, j) => (
                <Text
                  key={j}
                  style={{
                    ...styles.tablaCeldaTexto,
                    flex: 1,
                    paddingHorizontal: 4,
                    textAlign: widget.columnas[j]?.numerica ? "right" : "left",
                    ...(widget.colores[i]?.[j] ? { color: widget.colores[i][j] as string, fontWeight: "bold" } : {}),
                  }}
                >
                  {formatearCeldaBI(v, widget.columnas[j]?.numerica ? "numero" : "texto", widget.columnas[j]?.sufijo)}
                </Text>
              ))}
            </View>
          ))
        )}
      </View>
      {widget.totalFilas > widget.filas.length && (
        <Text style={{ ...styles.kpiCaption, marginTop: 4 }}>Se muestran {widget.filas.length} de {widget.totalFilas} registros — el detalle completo está en el dashboard.</Text>
      )}
    </View>
  );
}

/** Página con la vista de "Mis dashboards" elegida al generar el reporte — sus KPIs y tablas, en el orden de la cuadrícula. */
function PaginaVistaDashboard({ vista }: { vista: VistaDashboardReporte }) {
  const kpis = vista.widgets.filter((w): w is Extract<WidgetReporte, { tipo: "kpi" }> => w.tipo === "kpi");
  const resto = vista.widgets.filter((w) => w.tipo !== "kpi");
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerTitulo}>{vista.nombre}</Text>
          <Text style={styles.headerSubtitulo}>DASHBOARD · CIFRAS AL {fmtFechaPdf(new Date()).toUpperCase()}</Text>
        </View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no <img> de HTML; no acepta `alt`. */}
        <Image src={KABAT_LOGO_DATA_URI} style={styles.headerLogo} />
      </View>

      {enGrupos(kpis, TARJETAS_POR_FILA).map((grupo, i) => (
        <View key={`kpi-${i}`} style={styles.fila} wrap={false}>
          {grupo.map((k, j) => (
            <Tarjeta key={j} titulo={k.titulo}>
              <Text style={k.color ? { ...styles.kpiValor, color: k.color } : styles.kpiValor}>{formatearValorBI(k.valor, k.sufijo)}</Text>
              <Text style={styles.kpiCaption}>{k.detalle}</Text>
            </Tarjeta>
          ))}
          {grupo.length < TARJETAS_POR_FILA && Array.from({ length: TARJETAS_POR_FILA - grupo.length }).map((_, j) => (
            <View key={`kpi-hueco-${j}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}

      {resto.map((w, i) =>
        w.tipo === "tabla" ? (
          <TablaWidgetVista key={i} widget={w} />
        ) : w.tipo === "grafica" ? (
          <View key={i} style={{ marginBottom: 14 }} wrap={false}>
            <Text style={styles.seccionTitulo}>{w.titulo.toUpperCase()}</Text>
            {/* Sin `flex: 1` de styles.tarjeta: en una columna colapsa la tarjeta a alto 0 y la imagen no se ve. */}
            <View style={{ backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: BORDER, padding: 8 }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no <img> de HTML; no acepta `alt`. */}
              <Image src={`data:image/png;base64,${w.png}`} style={tamanoGraficaPdf(w.ancho, w.alto)} />
            </View>
            {w.nota && <Text style={{ ...styles.kpiCaption, marginTop: 4 }}>{w.nota}</Text>}
          </View>
        ) : w.tipo === "nota" ? (
          <View key={i} style={{ marginBottom: 14 }} wrap={false}>
            <Text style={styles.seccionTitulo}>{w.titulo.toUpperCase()}</Text>
            <Text style={styles.listaVacio}>{w.texto}</Text>
          </View>
        ) : null
      )}

      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>Orión · Control Vehicular — Grupo Kabat</Text>
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

/**
 * Documento PDF del reporte "Estatus semanal de flota" — una página por
 * alcance: primero el resumen general (todos los proyectos permitidos, si se
 * incluyó), y después el desglose individual de cada proyecto seleccionado.
 * Ver src/lib/reportes/estatus-flota.ts y EstatusFlotaModal.
 */
export function EstatusFlotaDocument({
  datos,
  indicadoresDashboard,
  ordenSecciones,
  incluirGeneral = true,
  vistaDashboard,
  vistasDashboard,
}: {
  datos: EstatusFlotaReporte;
  indicadoresDashboard?: IndicadorDashboard[];
  /** Vista guardada de "Mis dashboards" elegida en el modal (compatibilidad con un solo dashboard). */
  vistaDashboard?: VistaDashboardReporte | null;
  /** Vistas guardadas de "Mis dashboards" elegidas en el modal — van como páginas iniciales. */
  vistasDashboard?: VistaDashboardReporte[] | null;
  /** Orden en que se muestran las secciones — ver EstatusFlotaModal. Sin especificar, usa ORDEN_SECCIONES_DEFAULT. */
  ordenSecciones?: SeccionReporteId[];
  /** Alcance completo de la plataforma (o de todo lo permitido al usuario) — independiente de qué proyectos se hayan seleccionado para desglosar. Se sigue calculando siempre (ver calcularEstatusFlotaReporte); esto solo decide si se incluye en el documento. */
  incluirGeneral?: boolean;
}) {
  const listaVistas = vistasDashboard ?? (vistaDashboard ? [vistaDashboard] : []);
  return (
    <Document>
      {listaVistas.map((vista) => (
        <PaginaVistaDashboard key={vista.id} vista={vista} />
      ))}
      {/* Los indicadores del dashboard actual solo aplican al alcance general —
          es el mismo alcance que se ve al abrir "Mis dashboards". */}
      {incluirGeneral && <PaginaEstatus datos={datos.general} indicadoresDashboard={indicadoresDashboard} ordenSecciones={ordenSecciones} />}
      {datos.porProyecto.map((p, i) => (
        <PaginaEstatus key={i} datos={p} ordenSecciones={ordenSecciones} />
      ))}
    </Document>
  );
}
