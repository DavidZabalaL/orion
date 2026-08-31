import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import { LABEL_ESTATUS, LABEL_MOTIVO } from "@/lib/reportes/estatus-flota-labels";
import type { EstatusFlota, EstatusFlotaReporte } from "@/lib/reportes/estatus-flota";

const NAVY = "#0f1b2d";
const BLUE = "#2b7fff";
const SLATE = "#6c757d";
const BORDER = "#e8ecef";
const SURFACE = "#f6f9fc";

const styles = StyleSheet.create({
  page: { fontSize: 10.5, fontFamily: "Helvetica", color: NAVY, paddingBottom: 48 },

  header: { backgroundColor: NAVY, paddingTop: 28, paddingBottom: 22, paddingHorizontal: 36 },
  headerEyebrow: { fontSize: 9, color: "#9fb0d0", letterSpacing: 1.5, marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#ffffff" },
  headerMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 },
  headerBrand: { fontSize: 10, color: "#c5d0e4" },
  headerDate: { fontSize: 10, color: "#c5d0e4" },
  accentBar: { height: 4, backgroundColor: BLUE },

  body: { paddingHorizontal: 36, paddingTop: 24 },

  sectionTitle: {
    fontSize: 12, fontWeight: "bold", color: NAVY, marginBottom: 12, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid",
  },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 10, marginBottom: 26 },
  kpiCard: {
    width: "31.5%", borderTopWidth: 3, borderTopColor: BLUE, borderTopStyle: "solid",
    backgroundColor: "#ffffff", borderWidth: 1, borderColor: BORDER, borderStyle: "solid", borderRadius: 4, padding: 12,
  },
  kpiValue: { fontSize: 18, fontWeight: "bold", color: NAVY },
  kpiLabel: { fontSize: 8.5, color: SLATE, marginTop: 4 },

  tabla: { marginBottom: 26, borderWidth: 1, borderColor: BORDER, borderStyle: "solid", borderRadius: 4, overflow: "hidden" },
  filaHeader: { flexDirection: "row", backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid" },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid" },
  celdaLabel: { flex: 1, padding: 8, fontSize: 9.5 },
  celdaValor: { width: 100, padding: 8, fontSize: 9.5, textAlign: "right", fontWeight: "bold" },
  celdaHeaderTexto: { fontSize: 8.5, fontWeight: "bold", color: SLATE, letterSpacing: 0.5 },
  sinDatos: { fontSize: 9.5, color: SLATE, padding: 10 },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 36, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid", flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#a0b0d0" },
});

function fmtMoneyPdf(valor: number): string {
  return `$${valor.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

function fmtFechaPdf(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
}

function Tabla({ filas, vacio }: { filas: { label: string; valor: string }[]; vacio: string }) {
  if (filas.length === 0) return <Text style={styles.sinDatos}>{vacio}</Text>;
  return (
    <View style={styles.tabla}>
      {filas.map((f, i) => (
        <View key={f.label} style={i === filas.length - 1 ? { flexDirection: "row" } : styles.fila}>
          <Text style={styles.celdaLabel}>{f.label}</Text>
          <Text style={styles.celdaValor}>{f.valor}</Text>
        </View>
      ))}
    </View>
  );
}

/** Una página del reporte para un alcance específico (general, selección combinada, o un proyecto individual). */
function PaginaEstatus({ datos }: { datos: EstatusFlota }) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>ORIÓN · CONTROL VEHICULAR — GRUPO KABAT</Text>
        <Text style={styles.headerTitle}>Estatus de flota — {datos.proyectoLabel}</Text>
        <View style={styles.headerMeta}>
          <Text style={styles.headerBrand}>{fmtFechaPdf(datos.desde)} — {fmtFechaPdf(datos.hasta)}</Text>
          <Text style={styles.headerDate}>Generado el {fmtFechaPdf(new Date())}</Text>
        </View>
      </View>
      <View style={styles.accentBar} />

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Disponibilidad (SLA)</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{datos.slaPromedio !== null ? `${datos.slaPromedio}%` : "—"}</Text>
            <Text style={styles.kpiLabel}>SLA promedio del periodo</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{datos.unidadesDisponibles}</Text>
            <Text style={styles.kpiLabel}>Unidades disponibles</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{datos.unidadesNoDisponibles}</Text>
            <Text style={styles.kpiLabel}>Unidades no disponibles</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Estatus de la flota</Text>
        <Tabla
          vacio="Sin unidades en este alcance."
          filas={datos.porEstatus.map((e) => ({ label: LABEL_ESTATUS[e.estatus], valor: String(e.cantidad) }))}
        />

        <Text style={styles.sectionTitle}>Motivos de indisponibilidad</Text>
        <Tabla
          vacio="Ninguna unidad no disponible en este alcance."
          filas={datos.porMotivo.map((m) => ({
            label: m.motivo === "SIN_MOTIVO" ? "Sin motivo registrado" : LABEL_MOTIVO[m.motivo],
            valor: String(m.cantidad),
          }))}
        />

        <Text style={styles.sectionTitle}>Gastos del periodo — {fmtMoneyPdf(datos.gastoTotal)}</Text>
        <Tabla
          vacio="Sin gastos registrados en el periodo."
          filas={datos.gastoPorCategoria.map((g) => ({ label: CATEGORIA_GASTO_LABEL[g.categoria] ?? g.categoria, valor: fmtMoneyPdf(g.monto) }))}
        />
      </View>

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
export function EstatusFlotaDocument({ datos }: { datos: EstatusFlotaReporte }) {
  return (
    <Document>
      <PaginaEstatus datos={datos.general} />
      {datos.seleccion && <PaginaEstatus datos={datos.seleccion} />}
      {datos.porProyecto.map((p, i) => (
        <PaginaEstatus key={i} datos={p} />
      ))}
    </Document>
  );
}
