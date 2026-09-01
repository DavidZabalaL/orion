import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

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
  headerEyebrow: { fontSize: 9, color: "#9fb0d0", letterSpacing: 1.5, marginBottom: 6 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
  headerMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 },
  headerBrand: { fontSize: 10, color: "#c5d0e4" },
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
  // maxHeight es clave: la imagen rasterizada puede venir con cualquier
  // proporción (según el tamaño real del contenedor en pantalla), y sin tope
  // puede terminar ocupando casi una página entera.
  chartImage: { width: "100%", maxHeight: 260, objectFit: "contain" },

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
  charts: { title: string; dataUrl: string }[];
}

/** Documento del "resumen ejecutivo" exportable en PDF desde el Dashboard — ver ExportSummaryModal. */
export function ExecutiveSummaryDocument({ title, date, summary, kpis, charts }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>ORIÓN · CONTROL VEHICULAR — GRUPO KABAT</Text>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerMeta}>
            <Text style={styles.headerBrand}>Grupo Kabat</Text>
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
                    <Image src={c.dataUrl} style={styles.chartImage} />
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
