// Incluye una vista guardada de "Mis dashboards" (VistaDashboardBI) en el
// reporte de Estatus de flota — descarga PDF, correo inmediato y envío
// programado. Cada widget se re-ejecuta en el servidor con el mismo motor BI
// que usa la pantalla (motor-consultas.ts) y se presenta como en el dashboard:
//   - contador                 → KPI (con su regla de color)
//   - tabla de registros       → tabla (celdas con reglas de color)
//   - widget en vista "tabla"  → tabla simple o cruzada (con reglas de color)
//   - pie/barras/líneas/avance → la gráfica, como imagen PNG (graficas-reporte.tsx)
// Igual que en pantalla, las reglas de color aplican a contadores y tablas,
// no a las barras/porciones de una gráfica. Histograma, dispersión y caja no
// tienen equivalente estático legible: se listan con una nota.
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerDataset, obtenerCampo, type WidgetDashboardBI, type DatasetMeta, type CampoMeta } from "@/lib/bi/metadata";
import { ejecutarSimple, ejecutarTablaFilas, ejecutarAvance, ejecutarCruzado, validarColumnasTabla, ejeYLabelSimple, ejeYSufijo } from "@/lib/bi/motor-consultas";
import { colorParaValor, promedioDe, type ReglaColorColumna } from "@/lib/bi/reglas-color";
import { graficaPng, recortarCategorias, type EspecGrafica } from "@/lib/reportes/graficas-reporte";

/** Filas máximas por tabla dentro del reporte (la pantalla permite hasta 500; en un correo/PDF eso no se lee). */
const MAX_FILAS_TABLA_REPORTE = 50;

export type ColumnaWidgetReporte = { label: string; numerica: boolean; sufijo: string };

export type WidgetReporte =
  | { tipo: "kpi"; titulo: string; valor: number; sufijo: string; detalle: string; color: string | null }
  | {
      tipo: "tabla";
      titulo: string;
      columnas: ColumnaWidgetReporte[];
      filas: (string | number | null)[][];
      /** Color de texto por celda según las reglas de color del widget (null = sin regla). */
      colores: (string | null)[][];
      totalFilas: number;
    }
  | {
      tipo: "grafica";
      titulo: string;
      /** PNG en base64 (sin prefijo data:). */
      png: string;
      ancho: number;
      alto: number;
      /** Content-ID del adjunto inline en el correo (<img src="cid:...">). */
      cid: string;
      nota?: string;
    }
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

const etiqueta = (campo: CampoMeta, valor: string) => campo.opciones?.find((o) => o.valor === valor)?.label ?? valor;

/** Colores por celda: solo columnas numéricas, con el promedio de su columna (para "sobre/bajo promedio"). */
function coloresTabla(columnas: ColumnaWidgetReporte[], filas: (string | number | null)[][], reglas: ReglaColorColumna[] | undefined): (string | null)[][] {
  if (!reglas || reglas.length === 0) return filas.map((f) => f.map(() => null));
  const numero = (v: string | number | null) => (v === null || v === "" ? null : Number(v));
  const promedios = columnas.map((c, j) => (c.numerica ? promedioDe(filas.map((f) => numero(f[j])).filter((v): v is number => v !== null && Number.isFinite(v))) : undefined));
  return filas.map((f) =>
    f.map((v, j) => {
      const n = numero(v);
      return columnas[j].numerica && n !== null && Number.isFinite(n) ? colorParaValor(n, columnas[j].label, reglas, promedios[j]) : null;
    })
  );
}

function tabla(titulo: string, columnas: ColumnaWidgetReporte[], todas: (string | number | null)[][], reglas: ReglaColorColumna[] | undefined): WidgetReporte {
  const filas = todas.slice(0, MAX_FILAS_TABLA_REPORTE);
  return { tipo: "tabla", titulo, columnas, filas, colores: coloresTabla(columnas, filas, reglas), totalFilas: todas.length };
}

async function grafica(titulo: string, espec: EspecGrafica, cid: string, nota?: string): Promise<WidgetReporte> {
  const { base64, ancho, alto } = await graficaPng(espec);
  return { tipo: "grafica", titulo, png: base64, ancho, alto, cid, nota };
}

async function calcularWidget(w: WidgetDashboardBI, permitidos: string[] | null, cid: string): Promise<WidgetReporte | null> {
  const dataset = obtenerDataset(w.dataset);
  if (!dataset) return null;
  const titulo = w.label || dataset.label;
  const { condicion, llave } = alcanceWidget(dataset, w.proyectoIds, permitidos);
  const filtrosLlave = JSON.stringify(w.filtros ?? []);

  if (w.tipoWidget === "tabla_filas") {
    const columnas = validarColumnasTabla(dataset, w.columnas);
    if (!columnas) return null;
    const r = await ejecutarTablaFilas(dataset, columnas, w.filtros, condicion, llave, filtrosLlave);
    return tabla(
      titulo,
      columnas.map((c) => ({ label: c.label, numerica: c.tipo === "numero", sufijo: c.sufijo ?? "" })),
      r.filas.map((f) => columnas.map((c) => (typeof f[c.id] === "string" ? etiqueta(c, f[c.id] as string) : (f[c.id] ?? null)))),
      w.reglasColor
    );
  }

  if (w.tipoGrafica === "histograma" || w.tipoGrafica === "dispersion" || w.tipoGrafica === "caja") {
    return { tipo: "nota", titulo, texto: "Este tipo de gráfica no tiene una versión estática equivalente; consúltala en el dashboard." };
  }

  const campoX = obtenerCampo(dataset, w.ejeX);
  const campoY = obtenerCampo(dataset, w.ejeY) ?? campoX;
  if (!campoX || !campoY) return null;
  const esSerieTiempo = campoX.tipo === "fecha_mes" || campoX.tipo === "fecha_dia";

  if (w.tipoGrafica === "avance") {
    const campoMeta = w.ejeMeta ? obtenerCampo(dataset, w.ejeMeta) : undefined;
    if (!campoMeta) return null;
    const r = await ejecutarAvance(dataset, campoX, campoY, campoMeta, w.filtros, condicion, llave, filtrosLlave);
    return grafica(
      titulo,
      {
        tipo: "avance",
        datos: r.datos.slice(0, 12).map((d) => ({ label: etiqueta(campoX, d.dimension), valor: d.valor, meta: d.meta })),
        sufijo: r.ejeY.sufijo,
        sufijoMeta: r.ejeMeta.sufijo,
        etiquetaMeta: r.ejeMeta.label,
        etiquetaValor: r.ejeY.label,
        colorimetria: w.colorimetria ?? "negativo",
      },
      cid,
      r.datos.length > 12 ? `Se muestran 12 de ${r.datos.length}; el resto está en el dashboard.` : undefined
    );
  }

  // Barras con segundo grupo (o pirámide, siempre de 2 grupos): tabla cruzada.
  const campoSplit = w.ejeSplit && (w.tipoGrafica === "barras" || w.tipoGrafica === "piramide") ? obtenerCampo(dataset, w.ejeSplit) : undefined;
  if (campoSplit) {
    const r = await ejecutarCruzado(dataset, campoX, campoY, w.agregacion, campoSplit, w.orden, w.filtros, condicion, llave, filtrosLlave);
    // Columnas con el valor tal cual (como la tabla cruzada del dashboard): las
    // reglas de color se escriben contra ese nombre, no contra la etiqueta.
    const series = r.cruzado.series.map((s) => ({ valor: s, label: s }));
    if (w.vistaPreferida === "tabla") {
      return tabla(
        titulo,
        [{ label: campoX.label, numerica: false, sufijo: "" }, ...series.map((s) => ({ label: s.label, numerica: true, sufijo: r.ejeY.sufijo }))],
        r.cruzado.filas.map((f) => [etiqueta(campoX, f.dimension), ...series.map((s) => f.valores[s.valor] ?? 0)]),
        w.reglasColor
      );
    }
    const visibles = series.slice(0, 8);
    return grafica(
      titulo,
      {
        tipo: "agrupadas",
        series: visibles.map((s) => s.label),
        filas: r.cruzado.filas.slice(0, 12).map((f) => ({ label: etiqueta(campoX, f.dimension), valores: Object.fromEntries(visibles.map((s) => [s.label, f.valores[s.valor] ?? 0])) })),
        sufijo: r.ejeY.sufijo,
      },
      cid
    );
  }

  const r = await ejecutarSimple(dataset, campoX, campoY, w.agregacion, w.orden, w.filtros, condicion, llave, filtrosLlave, true);
  const sufijo = ejeYSufijo(w.agregacion, campoY);
  const ejeYLabel = ejeYLabelSimple(w.agregacion, campoY);

  if (w.tipoGrafica === "contador") {
    const suma = r.datos.reduce((acc, d) => acc + d.valor, 0);
    const valor = w.agregacion === "promedio" && r.datos.length > 0 ? suma / r.datos.length : suma;
    return { tipo: "kpi", titulo, valor, sufijo, detalle: ejeYLabel, color: colorParaValor(valor, ejeYLabel, w.reglasColor) };
  }

  const datos = r.datos.map((d) => ({ label: etiqueta(campoX, d.dimension), valor: d.valor }));
  if (w.vistaPreferida === "tabla") {
    return tabla(titulo, [{ label: campoX.label, numerica: false, sufijo: "" }, { label: ejeYLabel, numerica: true, sufijo }], datos.map((d) => [d.label, d.valor]), w.reglasColor);
  }

  const visibles = recortarCategorias(datos, esSerieTiempo);
  const nota = visibles.length < datos.length ? `Se muestran ${visibles.length} de ${datos.length} categorías; el resto está en el dashboard.` : undefined;
  if (w.tipoGrafica === "pie") return grafica(titulo, { tipo: "pie", datos: visibles, sufijo }, cid, nota);
  if (w.tipoGrafica === "lineas") return grafica(titulo, { tipo: "lineas", datos: visibles, sufijo }, cid, nota);
  return grafica(titulo, { tipo: "barras", orientacion: w.orientacion === "horizontal" ? "horizontal" : "vertical", datos: visibles, sufijo }, cid, nota);
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
  for (const [i, w] of widgets.entries()) {
    try {
      const r = await calcularWidget(w, permitidos, `grafica-${i}@orion`);
      if (r) resultados.push(r);
    } catch (e) {
      console.error("[reporte] widget", w.label, e);
      resultados.push({ tipo: "nota", titulo: w.label || "Widget", texto: "No se pudo calcular este widget." });
    }
  }
  return { id: vista.id, nombre: vista.nombre, widgets: resultados };
}

/** Adjuntos inline (CID) para el correo: una imagen por cada gráfica de la vista. */
export function adjuntosGraficas(vista: VistaDashboardReporte | null | undefined): { filename: string; content: Buffer; contentId: string }[] {
  if (!vista) return [];
  return vista.widgets
    .filter((w): w is Extract<WidgetReporte, { tipo: "grafica" }> => w.tipo === "grafica")
    .map((w, i) => ({ filename: `grafica-${i + 1}.png`, content: Buffer.from(w.png, "base64"), contentId: w.cid }));
}
