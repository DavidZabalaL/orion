// Primer corte de reportes BI en PDF: tabla + metadata, sin replicar las
// gráficas SVG interactivas de bi-chart.tsx (esa librería usa JSX de
// react-dom; @react-pdf/renderer tiene su propia API de primitivas SVG —
// portar gráficas fieles queda como mejora incremental posterior).
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { FilaReporte } from "@/lib/bi/ejecutar-reporte";

const estilos = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  titulo: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitulo: { fontSize: 10, color: "#555", marginBottom: 16 },
  filaEncabezado: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#333", paddingBottom: 4, marginBottom: 2 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  celdaEncabezado: { flex: 1, fontWeight: 700, fontSize: 9 },
  celda: { flex: 1, fontSize: 8.5, color: "#222" },
});

export async function generarPdfReporte(nombreReporte: string, columnas: { key: string; label: string }[], filas: FilaReporte[]): Promise<Buffer> {
  const documento = (
    <Document>
      <Page size="LETTER" style={estilos.page}>
        <Text style={estilos.titulo}>{nombreReporte}</Text>
        <Text style={estilos.subtitulo}>
          {filas.length} registro(s) · generado el {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}
        </Text>
        <View style={estilos.filaEncabezado}>
          {columnas.map((c) => (
            <Text key={c.key} style={estilos.celdaEncabezado}>{c.label}</Text>
          ))}
        </View>
        {filas.length === 0 ? (
          <Text>Sin registros para este reporte.</Text>
        ) : (
          filas.map((fila, i) => (
            <View key={i} style={estilos.fila}>
              {columnas.map((c) => (
                <Text key={c.key} style={estilos.celda}>{String(fila[c.key] ?? "")}</Text>
              ))}
            </View>
          ))
        )}
      </Page>
    </Document>
  );

  return renderToBuffer(documento);
}
