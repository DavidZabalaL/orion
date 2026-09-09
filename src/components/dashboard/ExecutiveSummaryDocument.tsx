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
    padding: 16,
    marginBottom: 26,
  },
  summaryLabel: { fontSize: 8.5, fontWeight: "bold", color: BLUE, letterSpacing: 1, marginBottom: 6 },
  summaryText: { fontSize: 11, lineHeight: 1.6, color: NAVY },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: NAVY,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 10, marginBottom: 28 },
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

  chartBlock: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: "solid",
    borderRadius: 4,
    overflow: "hidden",
  },
  chartTitleBar: {
    backgroundColor: SURFACE,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  chartTitle: { fontSize: 10, fontWeight: "bold", color: NAVY },
  chartImageWrap: { padding: 12, alignItems: "center" },

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
  charts: { title: string; dataUrl: string; width: number; height: number }[];
}

// Ancho útil de la página: A4 (595pt) menos los 36pt de margen de .body a
// cada lado, menos los 12pt de padding de .chartImageWrap a cada lado.
const CHART_IMAGE_WIDTH = 499;
// Tope generoso para que un widget muy angosto y alto (ej. una lista larga
// en tipoGrafica "avance") no termine ocupando varias páginas completas.
const CHART_IMAGE_MAX_HEIGHT = 620;

/**
 * Calcula el tamaño del <Image> a partir de la proporción real capturada en
 * pantalla (ver ExportSummaryModal) — reemplaza el `maxHeight` fijo anterior,
 * que dejaba mucho espacio en blanco en widgets naturalmente angostos y altos
 * (ej. "avance") y no reflejaba el ancho real de gráficas anchas.
 */
function tamanoImagen(width: number, height: number): { width: number; height: number } {
  if (!width || !height) return { width: CHART_IMAGE_WIDTH, height: 200 };
  const proporcion = height / width;
  let w = CHART_IMAGE_WIDTH;
  let h = w * proporcion;
  if (h > CHART_IMAGE_MAX_HEIGHT) {
    h = CHART_IMAGE_MAX_HEIGHT;
    w = h / proporcion;
  }
  return { width: w, height: h };
}

/** Documento del "resumen ejecutivo" exportable en PDF desde el Dashboard — ver ExportSummaryModal. */
export function ExecutiveSummaryDocument({ title, date, summary, kpis, charts }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
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

          {charts.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Gráficas</Text>
              {charts.map((c) => (
                <View key={c.title} style={styles.chartBlock} wrap={false}>
                  <View style={styles.chartTitleBar}>
                    <Text style={styles.chartTitle}>{c.title}</Text>
                  </View>
                  <View style={styles.chartImageWrap}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no <img> de HTML; no acepta `alt`. */}
                    <Image src={c.dataUrl} style={{ ...tamanoImagen(c.width, c.height), objectFit: "contain" }} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Orión · Control Vehicular — Grupo Kabat</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
