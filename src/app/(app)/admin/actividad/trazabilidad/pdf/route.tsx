import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { esDevAdmin } from "@/lib/permisos";
import { buscarTrazabilidad, MODULO_ACTIVIDAD_LABEL } from "@/lib/actividad";
import { ZONA_HORARIA_MX } from "@/lib/timezone";

const estilos = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  titulo: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitulo: { fontSize: 10, color: "#555", marginBottom: 16 },
  fila: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingVertical: 6 },
  usuario: { fontWeight: 700 },
  meta: { color: "#666", fontSize: 9 },
  detalle: { color: "#333", fontSize: 9, marginTop: 2 },
});

function fmtFecha(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "medium", timeZone: ZONA_HORARIA_MX }).format(d);
}

function fmtDetalle(detalle: unknown): string | null {
  if (!detalle || typeof detalle !== "object") return null;
  const d = detalle as Record<string, unknown>;
  if ("campo" in d) return `${String(d.campo)}: ${JSON.stringify(d.anterior)} -> ${JSON.stringify(d.nuevo)}`;
  if ("anterior" in d && "nuevo" in d) return `${JSON.stringify(d.anterior)} -> ${JSON.stringify(d.nuevo)}`;
  return JSON.stringify(d);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!(await esDevAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ error: "Falta el parámetro de búsqueda." }, { status: 400 });

  const eventos = await buscarTrazabilidad(q);

  const documento = (
    <Document>
      <Page size="LETTER" style={estilos.page}>
        <Text style={estilos.titulo}>Trazabilidad — {q}</Text>
        <Text style={estilos.subtitulo}>
          {eventos.length} evento(s) · generado el {fmtFecha(new Date())}
        </Text>
        {eventos.length === 0 ? (
          <Text>Sin eventos registrados.</Text>
        ) : (
          eventos.map((e) => {
            const detalleTexto = fmtDetalle(e.detalle);
            return (
              <View key={e.id} style={estilos.fila}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.usuario}>{e.usuario} — {e.accion}</Text>
                  <Text style={estilos.meta}>
                    {(MODULO_ACTIVIDAD_LABEL[e.modulo] ?? e.modulo)}
                    {e.entidad ? ` · ${e.entidad}` : ""}
                    {e.entidadId ? ` · ${e.entidadId}` : ""}
                  </Text>
                  {detalleTexto && <Text style={estilos.detalle}>{detalleTexto}</Text>}
                </View>
                <Text style={estilos.meta}>{fmtFecha(e.createdAt)}</Text>
              </View>
            );
          })
        )}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(documento);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="trazabilidad-${q.replace(/[^a-z0-9-_]+/gi, "_")}.pdf"`,
    },
  });
}
