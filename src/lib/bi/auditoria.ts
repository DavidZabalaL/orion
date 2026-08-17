// Gobernanza: registro de quién vio/exportó/recibió qué reporte o vista de
// BI. Complementa (no reemplaza) ActivityLog — este modelo es específico del
// módulo de Reportes/BI y guarda además datasets y alcance de proyecto
// efectivamente expuestos, para auditar exposición de datos.
import { prisma } from "@/lib/prisma";

export type AccionAccesoBI = "vio" | "exporto_pdf" | "exporto_excel" | "exporto_imagen" | "recibio_correo";
export type TipoRecursoBI = "vista_dashboard" | "explorador" | "reporte_programado";

export async function registrarAccesoReporteBI(input: {
  userId: string;
  tipoRecurso: TipoRecursoBI;
  accion: AccionAccesoBI;
  recursoId?: string;
  datasetIds?: string[];
  proyectoIds?: string[];
  detalle?: Record<string, unknown>;
}): Promise<void> {
  await prisma.accesoReporteBI.create({
    data: {
      userId: input.userId,
      tipoRecurso: input.tipoRecurso,
      accion: input.accion,
      recursoId: input.recursoId,
      datasetIds: input.datasetIds ?? [],
      proyectoIds: input.proyectoIds ?? [],
      detalle: input.detalle as never,
    },
  });
}
