import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { KABAT_LOGO_DATA_URI } from "@/components/dashboard/kabat-logo-base64";

const NAVY = "#0f1b2d";
const BLUE = "#2b7fff";
const SLATE = "#6c757d";
const BORDER = "#e8ecef";
const SURFACE = "#f6f9fc";

const styles = StyleSheet.create({
  page: { fontSize: 10.5, fontFamily: "Helvetica", color: NAVY, paddingBottom: 48 },

  header: {
    backgroundColor: NAVY,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 36,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerEyebrow: { fontSize: 9, color: "#9fb0d0", letterSpacing: 1.5, marginBottom: 6 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
  headerLogo: { width: 58, height: 39, objectFit: "contain" },
  headerMeta: { flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end", marginTop: 14 },
  headerDate: { fontSize: 10, color: "#c5d0e4" },
  accentBar: { height: 4, backgroundColor: BLUE },

  body: { paddingHorizontal: 36, paddingTop: 24 },

  summaryBox: {
    backgroundColor: SURFACE,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    borderLeftStyle: "solid",
    borderRadius: 3,
    padding: 14,
    marginBottom: 18,
  },
  summaryLabel: { fontSize: 8.5, fontWeight: "bold", color: BLUE, letterSpacing: 1, marginBottom: 6 },
  summaryText: { fontSize: 11, lineHeight: 1.6, color: NAVY },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: NAVY,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 10, marginBottom: 18 },
  kpiCard: {
    width: "31.5%",
    borderTopWidth: 3,
    borderTopColor: BLUE,
    borderTopStyle: "solid",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: "solid",
    borderRadius: 4,
    padding: 12,
  },
  kpiValue: { fontSize: 18, fontWeight: "bold", color: NAVY },
  kpiLabel: { fontSize: 8.5, color: SLATE, marginTop: 4 },

  // Antes cada gráfica era una tarjeta con marco + barra de título sombreada
  // ("todo separado" fue la queja concreta del usuario) — un reporte impreso
  // lee mejor como secciones de un mismo documento continuo: una etiqueta
  // discreta arriba de la imagen, sin caja ni fondo propio.
  chartsGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 16 },
  chartBlock: {},
  chartTitle: { fontSize: 9, fontWeight: "bold", color: SLATE, letterSpacing: 0.4, marginBottom: 5, textTransform: "uppercase" },
  chartImageWrap: { alignItems: "center" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: "solid",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#a0b0d0" },
});

interface Props {
  title: string;
  date: string;
  summary: string;
  kpis: { title: string; value: string }[];
  charts: { title: string; dataUrl: string; width: number; height: number; chartKind?: string }[];
}

// Ancho útil de la página: A4 horizontal (842pt) menos los 36pt de margen de
// .body a cada lado — landscape porque, a diferencia de una carta de texto,
// este reporte es casi todo gráficas/tablas anchas, y el ancho extra reduce
// tanto el recorte de etiquetas como las páginas casi vacías.
const PAGE_CONTENT_WIDTH = 770;
const CHARTS_GRID_GAP = 18;
const CHART_FULL_WIDTH = PAGE_CONTENT_WIDTH;
const CHART_HALF_WIDTH = (PAGE_CONTENT_WIDTH - CHARTS_GRID_GAP) / 2;
// Tope de alto por imagen — bajo a propósito: con el tope alto anterior
// (440) cada fila copaba casi toda una página de por sí, así que el reporte
// terminaba con exactamente una fila por página aunque hubiera espacio de
// sobra ("todo separado" — la queja del usuario). Con un tope más chico caben
// dos filas en una misma página en la mayoría de los casos.
const CHART_IMAGE_MAX_HEIGHT = 340;
// Qué tipos de gráfica comparten fila en dos columnas: "avance" (listas de
// barras de progreso) y "pie" son angostas por diseño — el resto (barras,
// tablas, etc.) siempre va a ancho completo, porque necesita todo el espacio
// para no encimar sus propias etiquetas. Antes esto se inferia del ancho
// capturado en pantalla, pero ese ancho depende del viewport de quien
// exporta el PDF, no del tipo de gráfica — con una ventana angosta, hasta una
// gráfica de barras terminaba clasificada como "angosta" y se encimaba con
// su pareja.
const ANCHOS_ANGOSTOS = new Set(["avance", "pie"]);

/** Calcula el tamaño del <Image> a partir de la proporción real capturada en pantalla (ver ExportSummaryModal), acotado al ancho de columna que le toque. */
function tamanoImagen(width: number, height: number, anchoMaximo: number): { width: number; height: number } {
  if (!width || !height) return { width: anchoMaximo, height: 200 };
  const proporcion = height / width;
  let w = anchoMaximo;
  let h = w * proporcion;
  if (h > CHART_IMAGE_MAX_HEIGHT) {
    h = CHART_IMAGE_MAX_HEIGHT;
    w = h / proporcion;
  }
  return { width: w, height: h };
}

type ChartImg = Props["charts"][number];

/**
 * Agrupa las gráficas en "filas" para el render: dos angostas (tipoGrafica en
 * ANCHOS_ANGOSTOS) consecutivas se emparejan en una fila de dos columnas; una
 * ancha (o una angosta que quedó sin pareja) va sola en su propia fila. No
 * basta con un solo contenedor flex-wrap para todas las gráficas — el motor
 * de paginación de @react-pdf/renderer decide los saltos de página elemento
 * por elemento, y en la práctica dos angostas dentro de un único flex-wrap
 * grande terminaban cada una en su propia página aunque cupieran una junto a
 * la otra. Envolver cada par en su propia fila (con `wrap={false}` sobre la
 * fila, no sobre cada gráfica) fuerza a que ambas se midan y salten de página
 * como una unidad.
 */
function agruparFilas(charts: ChartImg[]): ChartImg[][] {
  const esAngosta = (c: ChartImg) => !!c.chartKind && ANCHOS_ANGOSTOS.has(c.chartKind);
  const filas: ChartImg[][] = [];
  // Una angosta pendiente de pareja espera incluso a través de anchas
  // intermedias (que se van insertando en su propia fila mientras tanto) —
  // así, dos angostas separadas en el orden original por una ancha de por
  // medio (ej. angosta, ancha, angosta) igual se emparejan, en vez de que la
  // primera se quede sola solo por el orden en que llegaron los widgets.
  let pendiente: ChartImg | null = null;
  for (const c of charts) {
    if (esAngosta(c)) {
      if (pendiente) {
        filas.push([pendiente, c]);
        pendiente = null;
      } else {
        pendiente = c;
      }
    } else {
      filas.push([c]);
    }
  }
  if (pendiente) filas.push([pendiente]);
  return filas;
}

function FilaGraficas({ fila }: { fila: ChartImg[] }) {
  return (
    <View style={styles.chartsGrid}>
      {fila.map((c) => {
        const enPar = fila.length > 1;
        const anchoColumna = enPar ? CHART_HALF_WIDTH : CHART_FULL_WIDTH;
        return (
          <View key={c.title} style={{ ...styles.chartBlock, width: enPar ? "48.5%" : "100%" }}>
            <Text style={styles.chartTitle}>{c.title}</Text>
            <View style={styles.chartImageWrap}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no <img> de HTML; no acepta `alt`. */}
              <Image src={c.dataUrl} style={{ ...tamanoImagen(c.width, c.height, anchoColumna), objectFit: "contain" }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Documento del "resumen ejecutivo" exportable en PDF desde el Dashboard — ver ExportSummaryModal. */
export function ExecutiveSummaryDocument({ title, date, summary, kpis, charts }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerEyebrow}>ORIÓN · CONTROL VEHICULAR</Text>
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no <img> de HTML; no acepta `alt`. */}
            <Image src={KABAT_LOGO_DATA_URI} style={styles.headerLogo} />
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerDate}>{date}</Text>
          </View>
        </View>
        <View style={styles.accentBar} />

        <View style={styles.body}>
          {!!summary && (
            <View style={styles.summaryBox} wrap={false}>
              <Text style={styles.summaryLabel}>RESUMEN</Text>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>
          )}

          {kpis.length > 0 && (
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Indicadores clave</Text>
              <View style={styles.kpiGrid}>
                {kpis.map((k) => (
                  <View key={k.title} style={styles.kpiCard}>
                    <Text style={styles.kpiValue}>{k.value}</Text>
                    <Text style={styles.kpiLabel}>{k.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {charts.length > 0 &&
            (() => {
              const [primera, ...resto] = agruparFilas(charts);
              return (
                <View>
                  {/* El título y la primera fila viajan juntos (wrap={false}) para que
                      "Gráficas" nunca quede huérfano solo al fondo de una página, con
                      su contenido empezando hasta la siguiente. */}
                  <View wrap={false}>
                    <Text style={styles.sectionTitle}>Gráficas</Text>
                    <FilaGraficas fila={primera} />
                  </View>
                  {resto.length > 0 && (
                    <View style={{ gap: CHARTS_GRID_GAP, marginTop: CHARTS_GRID_GAP }}>
                      {resto.map((fila) => (
                        <View key={fila.map((c) => c.title).join("|")} wrap={false}>
                          <FilaGraficas fila={fila} />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Orión · Control Vehicular — Grupo Kabat</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
