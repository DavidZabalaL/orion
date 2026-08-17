// Exportación manual bajo demanda de una vista del explorador de BI a
// PDF/Excel. Reutiliza los mismos generadores del motor de reportes
// programados (src/lib/bi/excel-export.ts, src/lib/bi/pdf/reporte-tabla-pdf.tsx).
//
// Nota de diseño: a diferencia de /api/bi/insight (Fase 7), aquí SÍ se confía
// en los `datos` que manda el cliente en vez de re-ejecutar la consulta —
// son exactamente los mismos datos que ya se le devolvieron a ese usuario en
// esta sesión desde /api/bi/query (que ya aplicó whitelist + RLS), así que
// reformatearlos a PDF/Excel no abre una superficie nueva de acceso a datos.
// Sí se revalida el permiso de módulo y se registra auditoría.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { tienePermisoModulo } from "@/lib/permisos";
import { obtenerDataset } from "@/lib/bi/metadata";
import { generarExcelReporte } from "@/lib/bi/excel-export";
import { generarPdfReporte } from "@/lib/bi/pdf/reporte-tabla-pdf";
import { registrarAccesoReporteBI } from "@/lib/bi/auditoria";

const MAX_FILAS_EXPORT = 5000;

type BodyExportar = {
  dataset: string;
  formato: "excel" | "pdf";
  ejeXLabel?: string;
  ejeYLabel?: string;
  datos: { dimension: string; valor: number }[];
  proyectoIds?: string[];
};

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await tienePermisoModulo("M"))) {
    return NextResponse.json({ error: "No tienes permiso para exportar reportes de BI." }, { status: 403 });
  }

  let body: BodyExportar;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const dataset = obtenerDataset(body.dataset);
  if (!dataset) return NextResponse.json({ error: "Dataset desconocido." }, { status: 400 });
  if (!Array.isArray(body.datos)) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const formato = body.formato === "pdf" ? "pdf" : "excel";
  const ejeXLabel = typeof body.ejeXLabel === "string" ? body.ejeXLabel.slice(0, 120) : "Dimensión";
  const ejeYLabel = typeof body.ejeYLabel === "string" ? body.ejeYLabel.slice(0, 120) : "Valor";
  const datos = body.datos
    .slice(0, MAX_FILAS_EXPORT)
    .filter((d): d is { dimension: string; valor: number } => Boolean(d) && typeof d.dimension === "string" && typeof d.valor === "number")
    .map((d) => ({ dimension: d.dimension, valor: d.valor }));

  const columnas = [
    { key: "dimension", label: ejeXLabel },
    { key: "valor", label: ejeYLabel },
  ];

  const buffer = formato === "pdf" ? await generarPdfReporte(dataset.label, columnas, datos) : generarExcelReporte(dataset.label, columnas, datos);
  const mime = formato === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const nombreArchivo = `${dataset.id}.${formato === "pdf" ? "pdf" : "xlsx"}`;

  const session = await auth();
  if (session?.user?.id) {
    await registrarAccesoReporteBI({
      userId: session.user.id,
      tipoRecurso: "explorador",
      accion: formato === "pdf" ? "exporto_pdf" : "exporto_excel",
      datasetIds: [dataset.id],
      proyectoIds: Array.isArray(body.proyectoIds) ? body.proyectoIds : [],
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
