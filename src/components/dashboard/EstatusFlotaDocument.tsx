import { Document, Page, Text, View, StyleSheet, Svg, Circle, Image } from "@react-pdf/renderer";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import { LABEL_MOTIVO } from "@/lib/reportes/estatus-flota-labels";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { KABAT_LOGO_DATA_URI } from "@/components/dashboard/kabat-logo-base64";
import type { EstatusFlota, EstatusFlotaReporte, FlotaProyecto } from "@/lib/reportes/estatus-flota";
import type { CampoExtraResultado } from "@/lib/reportes/campos-extra-tipos";
import type { TipoVehiculo } from "@/generated/prisma/enums";

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
  return fecha.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }).replace(".", "");
}

function fmtFechaCorta(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { month: "short", day: "numeric" }).replace(".", "");
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

function TarjetaBarras({ titulo, filas, vacio, formatear = (v: number) => String(v) }: { titulo: string; filas: { label: string; valor: number }[]; vacio: string; formatear?: (v: number) => string }) {
  if (filas.length === 0) {
    return (
      <Tarjeta titulo={titulo}>
        <Text style={styles.listaVacio}>{vacio}</Text>
      </Tarjeta>
    );
  }
  const max = Math.max(...filas.map((f) => f.valor));
  return (
    <Tarjeta titulo={titulo}>
      {filas.map((f, i) => (
        <BarraHorizontal key={f.label} label={f.label} valor={f.valor} max={max} color={PALETA_BARRAS[i % PALETA_BARRAS.length]} formatear={formatear} />
      ))}
    </Tarjeta>
  );
}

function TarjetaKpiExtra({ resultado }: { resultado: CampoExtraResultado }) {
  return (
    <Tarjeta titulo={resultado.campoLabel}>
      <Text style={styles.kpiValor}>{(resultado.valorKpi ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}</Text>
      <Text style={styles.kpiCaption}>Suma total · {resultado.datasetLabel} (histórico del alcance)</Text>
    </Tarjeta>
  );
}

/**
 * Detalle completo (sin truncar) de cada unidad no disponible — económico,
 * vehículo (marca + modelo) y motivo. Se pidió explícitamente poder ver el
 * número económico de cada una, y de ser posible qué vehículo es — antes
 * esta sección solo mostraba un conteo agrupado con máximo 6 económicos por
 * motivo. Es una sección propia a ancho completo (no una tarjeta de la fila
 * de 3 columnas) porque la lista puede ser larga; al no llevar `wrap={false}`
 * fluye a la siguiente página sola si no cabe completa.
 */
function TablaUnidadesNoDisponibles({ datos }: { datos: EstatusFlota }) {
  if (datos.indisponibilidadDetalle.length === 0) return null;
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
          <Text style={{ ...styles.tablaCeldaHeader, width: 65 }}>ECONÓMICO</Text>
          <Text style={{ ...styles.tablaCeldaHeader, width: 200 }}>VEHÍCULO</Text>
          <Text style={{ ...styles.tablaCeldaHeader, width: 75 }}>TIPO</Text>
          <Text style={{ ...styles.tablaCeldaHeader, flex: 1 }}>MOTIVO</Text>
        </View>
        {filas.map((u, i) => (
          <View key={`${u.numeroEconomico}-${i}`} style={styles.tablaFila}>
            <Text style={{ ...styles.tablaCeldaTexto, width: 65, fontWeight: "bold" }}>{u.numeroEconomico}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, width: 200 }}>{u.vehiculo ?? "—"}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, width: 75 }}>{u.tipoVehiculo ? TIPO_VEHICULO_LABEL[u.tipoVehiculo] : "—"}</Text>
            <Text style={{ ...styles.tablaCeldaTexto, flex: 1 }}>
              {u.motivo === "SIN_MOTIVO" ? "Sin motivo" : LABEL_MOTIVO[u.motivo]}
              {u.motivoDetalle ? ` — ${u.motivoDetalle}` : ""}
            </Text>
          </View>
        ))}
      </View>
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
          • {f.numeroEconomico} ({CATEGORIA_MANTENIMIENTO_ABREV[f.categoria] ?? CATEGORIA_GASTO_LABEL[f.categoria]}) - {fmtFechaCorta(f.fecha)}
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

/** Una página del reporte para un alcance específico (general, selección combinada, o un proyecto individual). */
function PaginaEstatus({ datos, indicadoresDashboard }: { datos: EstatusFlota; indicadoresDashboard?: IndicadorDashboard[] }) {
  const pctPresupuesto = datos.presupuestoMes.asignado > 0 ? Math.round((datos.gastoTotal / datos.presupuestoMes.asignado) * 100) : 0;

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

      {indicadoresDashboard && indicadoresDashboard.length > 0 && (
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
      )}

      <View style={styles.fila} wrap={false}>
        <Tarjeta titulo="SLA promedio">
          <Text style={styles.kpiValor}>{datos.slaPromedio !== null ? `${datos.slaPromedio}%` : "—"}</Text>
          <Text style={styles.kpiCaption}>Disponibilidad ponderada del periodo</Text>
        </Tarjeta>
        <Tarjeta titulo="Unidades">
          <Text style={styles.kpiValor}>{datos.totalUnidades}</Text>
          <Text style={styles.kpiCaption}>{datos.unidadesDisponibles} disponibles · {datos.unidadesNoDisponibles} no disponibles</Text>
        </Tarjeta>
        <Tarjeta titulo="Actividad checklists">
          <Text style={styles.kpiValor}>{datos.checklistsPromedioDiario}</Text>
          <Text style={styles.kpiCaption}>promedio por día</Text>
        </Tarjeta>
      </View>

      <View style={styles.fila} wrap={false}>
        <Tarjeta titulo="Disponibilidad">
          <DonaDisponibilidad disponibles={datos.unidadesDisponibles} noDisponibles={datos.unidadesNoDisponibles} />
        </Tarjeta>
        <Tarjeta titulo="Gasto vs. presupuesto">
          <Text style={styles.kpiValor}>{fmtMoneyPdf(datos.gastoTotal)}</Text>
          <View style={styles.barraFondo}>
            <View style={{ width: `${Math.min(100, pctPresupuesto)}%`, height: "100%", backgroundColor: pctPresupuesto > 90 ? RED : BLUE }} />
          </View>
          <Text style={styles.kpiCaption}>Mes: {fmtMoneyPdf(datos.presupuestoMes.asignado)} · {pctPresupuesto}%</Text>
        </Tarjeta>
        <TarjetaBarras
          titulo="Desglose de gastos"
          vacio="Sin gastos registrados en el periodo."
          formatear={fmtMoneyPdf}
          filas={datos.gastoPorCategoria.map((g) => ({ label: CATEGORIA_GASTO_LABEL[g.categoria] ?? g.categoria, valor: g.monto }))}
        />
      </View>

      <TablaFlotaPorProyecto datos={datos.flotaPorProyecto} />

      <View style={styles.fila} wrap={false}>
        <Tarjeta titulo="Próximos servicios (7 días)">
          <ListaProximosServicios datos={datos} />
        </Tarjeta>
        <View style={{ flex: 2 }} />
      </View>

      <TablaUnidadesNoDisponibles datos={datos} />

      {enGrupos(datos.camposExtra, TARJETAS_POR_FILA).map((grupo, i) => (
        <View key={i} style={styles.fila} wrap={false}>
          {grupo.map((c) =>
            c.tipoVisualizacion === "kpi" ? (
              <TarjetaKpiExtra key={`${c.datasetId}.${c.campoId}`} resultado={c} />
            ) : (
              <TarjetaBarras
                key={`${c.datasetId}.${c.campoId}`}
                titulo={c.campoLabel}
                vacio="Sin datos."
                filas={(c.filas ?? []).map((f) => ({ label: f.label, valor: f.valor }))}
              />
            )
          )}
          {/* Rellena huecos de la última fila incompleta para que las tarjetas no se estiren de más. */}
          {grupo.length < TARJETAS_POR_FILA && Array.from({ length: TARJETAS_POR_FILA - grupo.length }).map((_, j) => (
            <View key={`hueco-${j}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}

      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>Orión · Control Vehicular — Grupo Kabat</Text>
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

/**
 * Documento PDF del reporte "Estatus semanal de flota" — una página por
 * alcance: primero el resumen general (todos los proyectos permitidos), luego
 * el resumen combinado de la selección (si se eligió algún proyecto), y
 * después el desglose individual de cada proyecto seleccionado. Ver
 * src/lib/reportes/estatus-flota.ts y EstatusFlotaModal.
 */
export function EstatusFlotaDocument({ datos, indicadoresDashboard }: { datos: EstatusFlotaReporte; indicadoresDashboard?: IndicadorDashboard[] }) {
  return (
    <Document>
      {/* Los indicadores del dashboard actual solo aplican al alcance general —
          es el mismo alcance que se ve al abrir "Mis dashboards". */}
      <PaginaEstatus datos={datos.general} indicadoresDashboard={indicadoresDashboard} />
      {datos.seleccion && <PaginaEstatus datos={datos.seleccion} />}
      {datos.porProyecto.map((p, i) => (
        <PaginaEstatus key={i} datos={p} />
      ))}
    </Document>
  );
}
