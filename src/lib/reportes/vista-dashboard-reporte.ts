// Incluye una vista guardada de "Mis dashboards" (VistaDashboardBI) en el
// reporte de Estatus de flota — descarga PDF, correo inmediato y envío
// programado. Cada widget se re-ejecuta en el servidor con el mismo motor BI
// que usa la pantalla (motor-consultas.ts), así el reporte dice lo mismo que
// el dashboard aunque no sea la vista abierta (o no haya sesión, en el cron):
//   - contador          → KPI
//   - tabla de registros → tabla con sus columnas
//   - cualquier gráfica  → tabla de datos (categoría + valor); las gráficas no
//     se dibujan en el correo, solo sus cifras.
// Histograma y dispersión no tienen una tabla de categoría/valor que
// signifique algo fuera de la gráfica: se listan con una nota en vez de datos.
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerDataset, obtenerCampo, type WidgetDashboardBI, type DatasetMeta } from "@/lib/bi/metadata";
import { ejecutarSimple, ejecutarTablaFilas, validarColumnasTabla, ejeYLabelSimple, ejeYSufijo } from "@/lib/bi/motor-consultas";

/** Filas máximas por tabla dentro del reporte (la pantalla permite hasta 500; en un correo/PDF eso no se lee). */
const MAX_FILAS_TABLA_REPORTE = 50;

export type ColumnaWidgetReporte = { label: string; numerica: boolean; sufijo: string };

export type WidgetReporte =
  | { tipo: "kpi"; titulo: string; valor: number; sufijo: string; detalle: string }
  | { tipo: "tabla"; titulo: string; columnas: ColumnaWidgetReporte[]; filas: (string | number | null)[][]; totalFilas: number }
  | { tipo: "nota"; titulo: string; texto: string };

export type VistaDashboardReporte = { id: string; nombre: string; widgets: WidgetReporte[] };

function alcanceWidget(dataset: DatasetMeta, proyectoIdsWidget: string[] | undefined, permitidos: string[] | null): { condicion: Prisma.Sql; llave: string } {
  let efectivos: string[] | null = permitidos;
  if (Array.isArray(proyectoIdsWidget) && proyectoIdsWidget.length > 0) {
    efectivos = permitidos === null ? proyectoIdsWidget : proyectoIdsWidget.filter((id) => permitidos.includes(id));
  }
  if (efectivos === null) return { condicion: Prisma.empty, llave: "ALL" };
  if (efectivos.length === 0) return { condicion: Prisma.sql`FALSE`, llave: "NONE" };
  return { condicion: Prisma.sql`${Prisma.raw(dataset.proyectoScopeExpr)} IN (${Prisma.join(efectivos)})`, llave: [...efectivos].sort().join(",") };
}

async function calcularWidget(w: WidgetDashboardBI, permitidos: string[] | null): Promise<WidgetReporte | null> {
  const dataset = obtenerDataset(w.dataset);
  if (!dataset) return null;
  const titulo = w.label || dataset.label;
  const { condicion, llave } = alcanceWidget(dataset, w.proyectoIds, permitidos);
  const filtrosLlave = JSON.stringify(w.filtros ?? []);

  if (w.tipoWidget === "tabla_filas") {
    const columnas = validarColumnasTabla(dataset, w.columnas);
    if (!columnas) return null;
    const r = await ejecutarTablaFilas(dataset, columnas, w.filtros, condicion, llave, filtrosLlave);
    return {
      tipo: "tabla",
      titulo,
      columnas: columnas.map((c) => ({ label: c.label, numerica: c.tipo === "numero", sufijo: c.sufijo ?? "" })),
      filas: r.filas.slice(0, MAX_FILAS_TABLA_REPORTE).map((f) => columnas.map((c) => f[c.id] ?? null)),
      totalFilas: r.filas.length,
    };
  }

  if (w.tipoGrafica === "histograma" || w.tipoGrafica === "dispersion") {
    return { tipo: "nota", titulo, texto: "Este tipo de gráfica no tiene una tabla de datos equivalente; consúltala en el dashboard." };
  }

  const campoX = obtenerCampo(dataset, w.ejeX);
  const campoY = obtenerCampo(dataset, w.ejeY) ?? campoX;
  if (!campoX || !campoY) return null;
  // "avance" compara dos sumas: su valor principal es la suma del eje Y.
  const agregacion = w.tipoGrafica === "avance" ? "suma" : w.agregacion;
  const r = await ejecutarSimple(dataset, campoX, campoY, agregacion, w.orden, w.filtros, condicion, llave, filtrosLlave);
  const sufijo = ejeYSufijo(agregacion, campoY);

  if (w.tipoGrafica === "contador") {
    const suma = r.datos.reduce((acc, d) => acc + d.valor, 0);
    const valor = agregacion === "promedio" && r.datos.length > 0 ? suma / r.datos.length : suma;
    return { tipo: "kpi", titulo, valor, sufijo, detalle: ejeYLabelSimple(agregacion, campoY) };
  }

  const labelPorValor = new Map((campoX.opciones ?? []).map((o) => [o.valor, o.label]));

  // Barra de avance: además del valor, la meta contra la que se compara (ej. gasto vs. presupuesto).
  const campoMeta = w.tipoGrafica === "avance" && w.ejeMeta ? obtenerCampo(dataset, w.ejeMeta) : undefined;
  if (campoMeta) {
    const meta = await ejecutarSimple(dataset, campoX, campoMeta, "suma", w.orden, w.filtros, condicion, llave, filtrosLlave);
    const metaPorDimension = new Map(meta.datos.map((d) => [d.dimension, d.valor]));
    return {
      tipo: "tabla",
      titulo,
      columnas: [
        { label: campoX.label, numerica: false, sufijo: "" },
        { label: campoY.label, numerica: true, sufijo },
        { label: campoMeta.label, numerica: true, sufijo: campoMeta.sufijo ?? "" },
        { label: "% de avance", numerica: true, sufijo: "%" },
      ],
      filas: r.datos.slice(0, MAX_FILAS_TABLA_REPORTE).map((d) => {
        const m = metaPorDimension.get(d.dimension) ?? 0;
        return [labelPorValor.get(d.dimension) ?? d.dimension, d.valor, m, m > 0 ? Math.round((d.valor / m) * 1000) / 10 : null];
      }),
      totalFilas: r.datos.length,
    };
  }

  return {
    tipo: "tabla",
    titulo,
    columnas: [
      { label: campoX.label, numerica: false, sufijo: "" },
      { label: ejeYLabelSimple(agregacion, campoY), numerica: true, sufijo },
    ],
    filas: r.datos.slice(0, MAX_FILAS_TABLA_REPORTE).map((d) => [labelPorValor.get(d.dimension) ?? d.dimension, d.valor]),
    totalFilas: r.datos.length,
  };
}

/**
 * Calcula los widgets de una vista guardada para el reporte. `permitidos` es
 * el alcance de proyectos de quien pide el reporte (null = sin restricción);
 * los proyectos elegidos en cada widget se intersectan con él, igual que en
 * pantalla. Devuelve null si la vista ya no existe (se borró después de
 * configurar el envío) — el reporte se genera sin esa sección en vez de fallar.
 */
export async function calcularVistaDashboardReporte(vistaId: string | null | undefined, permitidos: string[] | null): Promise<VistaDashboardReporte | null> {
  if (!vistaId) return null;
  const vista = await prisma.vistaDashboardBI.findUnique({ where: { id: vistaId }, select: { id: true, nombre: true, widgets: true } });
  if (!vista) return null;

  const widgets = (Array.isArray(vista.widgets) ? (vista.widgets as unknown as WidgetDashboardBI[]) : [])
    .filter((w) => w && typeof w === "object")
    .sort((a, b) => (a.layout?.y ?? 0) - (b.layout?.y ?? 0) || (a.layout?.x ?? 0) - (b.layout?.x ?? 0));

  const resultados: WidgetReporte[] = [];
  for (const w of widgets) {
    try {
      const r = await calcularWidget(w, permitidos);
      if (r) resultados.push(r);
    } catch {
      resultados.push({ tipo: "nota", titulo: w.label || "Widget", texto: "No se pudo calcular este widget." });
    }
  }
  return { id: vista.id, nombre: vista.nombre, widgets: resultados };
}
