// Registro de metadatos del motor de BI: cataloga qué columnas de qué
// tablas están disponibles por dataset. El endpoint /api/bi/query solo
// puede leer columnas declaradas aquí — nunca acepta nombres de columna
// o tabla directamente del cliente.
//
// Eje X y eje Y comparten el mismo catálogo de "campos" (misma lista para
// ambos selectores): el eje X siempre agrupa por el campo elegido; el eje Y
// además elige una agregación (conteo / suma / promedio) — suma y promedio
// solo aplican a campos numéricos.

import { ESTATUS_UNIDAD_LABEL, TIPO_VEHICULO_LABEL, ESTATUS_SEGURO_LABEL } from "@/lib/estatus";
import { ESTATUS_OPERADOR_LABEL, ESTATUS_DOCUMENTAL_LABEL, TIPO_DOCUMENTO_LABEL } from "@/lib/estatus-operador";
import { CATEGORIA_GASTO_LABEL, ESTATUS_GASTO_LABEL } from "@/lib/categorias-gasto";

function opcionesDe(label: Record<string, string>): { valor: string; label: string }[] {
  return Object.entries(label).map(([valor, label]) => ({ valor, label }));
}

export type TipoCampo = "texto" | "fecha_mes" | "fecha_dia" | "numero" | "geografico";
export type TipoAgregacion = "conteo" | "suma" | "promedio";
export type TipoGrafica =
  | "barras"
  | "lineas"
  | "pie"
  | "contador"
  | "puntos"
  | "divergente"
  | "histograma"
  | "dispersion"
  | "calendario"
  | "caja"
  | "piramide"
  | "mapa";

export const TIPO_GRAFICA_LABEL: Record<TipoGrafica, string> = {
  barras: "Barras",
  lineas: "Líneas",
  pie: "Pie",
  contador: "Contador",
  puntos: "Tira de puntos",
  divergente: "Barra divergente",
  histograma: "Histograma",
  dispersion: "Dispersión",
  calendario: "Calendario",
  caja: "Caja (box plot)",
  piramide: "Comparación de dos grupos",
  mapa: "Mapa (coroplético)",
};

type RequisitoCampo = TipoCampo[] | "cualquiera" | "ninguno";

/**
 * Qué tipo de campo acepta cada eje según el tipo de gráfica — usado tanto por
 * la UI (para filtrar opciones) como por el backend (para validar).
 *
 * `ejeSplit` declara si ese tipo de gráfica admite un segundo campo de
 * agrupación (cruce de 2 dimensiones): `obligatorio: true` lo fuerza (pirámide,
 * que siempre compara exactamente 2 categorías); `obligatorio: false` lo deja
 * opcional (barras: sin elegirlo es una gráfica simple, al elegirlo se activa
 * el cruce — barras agrupadas + tabla cruzada, sin tope de categorías).
 */
export const REQUISITOS_TIPO_GRAFICA: Record<TipoGrafica, { ejeX: RequisitoCampo; ejeY: RequisitoCampo; ejeSplit?: { tipos: RequisitoCampo; obligatorio: boolean } }> = {
  barras: { ejeX: "cualquiera", ejeY: "cualquiera", ejeSplit: { tipos: "cualquiera", obligatorio: false } },
  lineas: { ejeX: "cualquiera", ejeY: "cualquiera" },
  pie: { ejeX: "cualquiera", ejeY: "cualquiera" },
  contador: { ejeX: "cualquiera", ejeY: "cualquiera" },
  puntos: { ejeX: "cualquiera", ejeY: "cualquiera" },
  divergente: { ejeX: "cualquiera", ejeY: "cualquiera" },
  histograma: { ejeX: ["numero"], ejeY: "ninguno" },
  dispersion: { ejeX: ["numero"], ejeY: ["numero"] },
  calendario: { ejeX: ["fecha_dia"], ejeY: "cualquiera" },
  caja: { ejeX: "cualquiera", ejeY: ["numero"] },
  piramide: { ejeX: "cualquiera", ejeY: "cualquiera", ejeSplit: { tipos: "cualquiera", obligatorio: true } },
  mapa: { ejeX: ["geografico"], ejeY: "cualquiera" },
};

export function campoValidoParaEje(campo: CampoMeta, requisito: RequisitoCampo): boolean {
  if (requisito === "cualquiera" || requisito === "ninguno") return true;
  return requisito.includes(campo.tipo);
}

export type CampoMeta = {
  id: string;
  label: string;
  tipo: TipoCampo;
  /** Expresión SQL del campo, ya resuelta contra los JOIN del dataset. */
  expr: string;
  /** Si está presente, un filtro sobre este campo se muestra como checkboxes
   *  con estas opciones (multi-selección) en vez de un campo de texto libre. */
  opciones?: { valor: string; label: string }[];
};

export type DatasetMeta = {
  id: string;
  label: string;
  /** Tabla base + JOINs, ya armados como fragmento SQL fijo (sin input de usuario). */
  from: string;
  /** Expresión SQL cruda (no el campo COALESCE de exhibición) de la FK de
   *  proyecto alcanzable desde `from` — la usa EXCLUSIVAMENTE el motor de
   *  consultas para aplicar el alcance de proyecto obligatorio (permisos),
   *  nunca los filtros elegidos por quien arma el widget. */
  proyectoScopeExpr: string;
  campos: CampoMeta[];
  /** Modelos Prisma involucrados en `from` — usado únicamente para saber qué
   *  tag de caché invalidar (`bi-dataset:<id>`) cuando se escribe en alguna de
   *  estas tablas. Es metadata pura, no cambia el whitelist de seguridad. */
  tablasBase: string[];
  /**
   * Habilita análisis de cohortes (tipoAnalisis: "cohorte") para este
   * dataset — deliberadamente acotado a cohorte + evento repetible DENTRO
   * del mismo `from` (no cohortes cross-dataset, ya que el catálogo modela
   * "un dataset = un `from`"). Expresiones SQL fijas, igual que el resto de
   * la metadata: nunca vienen del cliente.
   */
  cohorteConfig?: {
    /** Fecha que define a qué cohorte (mes) pertenece la entidad — ej. mes de alta de la unidad. */
    campoOrigenExpr: string;
    /** Fecha del evento repetible que se mide por periodo — ej. cada carga de combustible. */
    campoEventoExpr: string;
    /** Identificador de la entidad que se seguirá a través de los periodos. */
    entidadIdExpr: string;
  };
};

export const BI_DATASETS: DatasetMeta[] = [
  {
    id: "unidades",
    label: "Inventario de unidades",
    from: `"Unidad" u LEFT JOIN "Proyecto" p ON p.id = u."proyectoId" LEFT JOIN "Operador" r ON r.id = u."resguardanteId"`,
    proyectoScopeExpr: `u."proyectoId"`,
    tablasBase: ["Unidad", "Proyecto", "Operador"],
    campos: [
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `u."estatus"`, opciones: opcionesDe(ESTATUS_UNIDAD_LABEL) },
      { id: "tipoVehiculo", label: "Tipo de vehículo", tipo: "texto", expr: `u."tipoVehiculo"`, opciones: opcionesDe(TIPO_VEHICULO_LABEL) },
      { id: "tipoCombustible", label: "Tipo de combustible", tipo: "texto", expr: `u."tipoCombustible"` },
      { id: "marca", label: "Marca", tipo: "texto", expr: `u."marca"` },
      { id: "unidadModelo", label: "Unidad / modelo comercial", tipo: "texto", expr: `u."unidadModelo"` },
      { id: "anio", label: "Año", tipo: "texto", expr: `u."anio"::text` },
      { id: "propietario", label: "Propietario", tipo: "texto", expr: `u."propietario"` },
      { id: "origenPlaca", label: "Origen de placa (estado)", tipo: "geografico", expr: `u."origenPlaca"` },
      { id: "resguardante", label: "Resguardante", tipo: "texto", expr: `COALESCE(r."nombre", 'Sin resguardante')` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mesAlta", label: "Mes de alta", tipo: "fecha_mes", expr: `u."fechaAlta"` },
      { id: "diaAlta", label: "Día de alta", tipo: "fecha_dia", expr: `u."fechaAlta"` },
      { id: "kmOficial", label: "Km oficial", tipo: "numero", expr: `u."kmOficial"` },
      { id: "rendimientoPromedio", label: "Rendimiento promedio", tipo: "numero", expr: `u."rendimientoPromedio"` },
      { id: "capacidadTanqueLitros", label: "Capacidad de tanque (litros)", tipo: "numero", expr: `u."capacidadTanqueLitros"` },
    ],
  },
  {
    id: "mantenimiento",
    label: "Mantenimiento y gastos",
    from: `"GastoVehicular" g LEFT JOIN "Proyecto" p ON p.id = g."proyectoReportanteId"`,
    proyectoScopeExpr: `g."proyectoReportanteId"`,
    tablasBase: ["GastoVehicular", "Proyecto"],
    campos: [
      { id: "categoria", label: "Categoría de gasto", tipo: "texto", expr: `g."categoria"`, opciones: opcionesDe(CATEGORIA_GASTO_LABEL) },
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `g."estatus"`, opciones: opcionesDe(ESTATUS_GASTO_LABEL) },
      { id: "proveedor", label: "Proveedor", tipo: "texto", expr: `COALESCE(g."proveedor", 'Sin proveedor')` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `g."fecha"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `g."fecha"` },
      { id: "costo", label: "Costo", tipo: "numero", expr: `g."costo"` },
    ],
  },
  {
    id: "combustible",
    label: "Combustible",
    from: `"Combustible" c LEFT JOIN "Proyecto" p ON p.id = c."proyectoReportanteId" LEFT JOIN "Unidad" u3 ON u3."numeroEconomico" = c."numeroEconomico"`,
    proyectoScopeExpr: `c."proyectoReportanteId"`,
    tablasBase: ["Combustible", "Proyecto", "Unidad"],
    cohorteConfig: {
      campoOrigenExpr: `u3."fechaAlta"`,
      campoEventoExpr: `c."fecha"`,
      entidadIdExpr: `c."numeroEconomico"`,
    },
    campos: [
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `c."fecha"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `c."fecha"` },
      { id: "litros", label: "Litros", tipo: "numero", expr: `c."litros"` },
      { id: "costo", label: "Costo", tipo: "numero", expr: `c."costo"` },
      { id: "rendimientoCalculado", label: "Rendimiento", tipo: "numero", expr: `c."rendimientoCalculado"` },
    ],
  },
  {
    id: "seguros",
    label: "Seguros y vencimientos",
    from: `"Seguro" s LEFT JOIN "Unidad" u2 ON u2."numeroEconomico" = s."numeroEconomico" LEFT JOIN "Proyecto" p ON p.id = u2."proyectoId"`,
    proyectoScopeExpr: `u2."proyectoId"`,
    tablasBase: ["Seguro", "Unidad", "Proyecto"],
    campos: [
      { id: "aseguradora", label: "Aseguradora", tipo: "texto", expr: `s."aseguradora"` },
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `s."estatus"`, opciones: opcionesDe(ESTATUS_SEGURO_LABEL) },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mesVencimiento", label: "Mes de vencimiento", tipo: "fecha_mes", expr: `s."fechaVencimiento"` },
      { id: "diaVencimiento", label: "Día de vencimiento", tipo: "fecha_dia", expr: `s."fechaVencimiento"` },
      { id: "costo", label: "Costo", tipo: "numero", expr: `s."costo"` },
    ],
  },
  {
    id: "operadores",
    label: "Operadores",
    from: `"Operador" o LEFT JOIN "Proyecto" p ON p.id = o."proyectoId"`,
    proyectoScopeExpr: `o."proyectoId"`,
    tablasBase: ["Operador", "Proyecto"],
    campos: [
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `o."estatus"`, opciones: opcionesDe(ESTATUS_OPERADOR_LABEL) },
      { id: "estatusDocumental", label: "Estatus documental", tipo: "texto", expr: `o."estatusDocumental"`, opciones: opcionesDe(ESTATUS_DOCUMENTAL_LABEL) },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mesAlta", label: "Mes de alta", tipo: "fecha_mes", expr: `o."createdAt"` },
    ],
  },
  {
    id: "documentos_operador",
    label: "Documentos de operadores",
    from: `"DocumentoOperador" do2 LEFT JOIN "Operador" o ON o.id = do2."operadorId" LEFT JOIN "Proyecto" p ON p.id = o."proyectoId"`,
    proyectoScopeExpr: `o."proyectoId"`,
    tablasBase: ["DocumentoOperador", "Operador", "Proyecto"],
    campos: [
      { id: "tipoDocumento", label: "Tipo de documento", tipo: "texto", expr: `do2."tipoDocumento"`, opciones: opcionesDe(TIPO_DOCUMENTO_LABEL) },
      { id: "tipoLicencia", label: "Tipo de licencia", tipo: "texto", expr: `COALESCE(do2."tipoLicencia"::text, 'N/A')` },
      { id: "verificado", label: "Verificación", tipo: "texto", expr: `CASE WHEN do2."verificado" THEN 'Verificado' ELSE 'Pendiente' END`, opciones: [{ valor: "Verificado", label: "Verificado" }, { valor: "Pendiente", label: "Pendiente" }] },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mesVencimiento", label: "Mes de vencimiento", tipo: "fecha_mes", expr: `do2."fechaVencimiento"` },
      { id: "diaVencimiento", label: "Día de vencimiento", tipo: "fecha_dia", expr: `do2."fechaVencimiento"` },
    ],
  },
  {
    id: "peajes",
    label: "TAG / Peajes",
    from: `"Tag" t LEFT JOIN "Proyecto" p ON p.id = t."proyectoReportanteId"`,
    proyectoScopeExpr: `t."proyectoReportanteId"`,
    tablasBase: ["Tag", "Proyecto"],
    campos: [
      { id: "proveedorTag", label: "Proveedor de TAG", tipo: "texto", expr: `t."proveedorTag"`, opciones: [{ valor: "IAVE", label: "IAVE" }, { valor: "PASE", label: "PASE" }, { valor: "TELEVIA", label: "Televía" }] },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `t."fecha"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `t."fecha"` },
      { id: "monto", label: "Monto", tipo: "numero", expr: `t."monto"` },
    ],
  },
  {
    id: "presupuesto_partida",
    label: "Presupuesto por partida (autorizado)",
    from: `"PresupuestoPartida" pp LEFT JOIN "Proyecto" p ON p.id = pp."proyectoId"`,
    proyectoScopeExpr: `pp."proyectoId"`,
    tablasBase: ["PresupuestoPartida", "Proyecto"],
    campos: [
      { id: "categoria", label: "Categoría de gasto", tipo: "texto", expr: `pp."categoria"`, opciones: opcionesDe(CATEGORIA_GASTO_LABEL) },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `make_date(pp."anio", pp."mes", 1)` },
      { id: "montoPresupuestado", label: "Monto presupuestado", tipo: "numero", expr: `pp."montoPresupuestado"` },
    ],
  },
  {
    id: "proyectos",
    label: "Proyectos",
    from: `"Proyecto" p`,
    proyectoScopeExpr: `p."id"`,
    tablasBase: ["Proyecto"],
    campos: [
      { id: "estadoRepublica", label: "Estado de la república", tipo: "geografico", expr: `p."estadoRepublica"` },
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `p."estatus"`, opciones: [{ valor: "ACTIVO", label: "Activo" }, { valor: "CERRADO", label: "Cerrado" }] },
      { id: "mesInicio", label: "Mes de inicio", tipo: "fecha_mes", expr: `p."fechaInicio"` },
      { id: "diaInicio", label: "Día de inicio", tipo: "fecha_dia", expr: `p."fechaInicio"` },
      { id: "presupuestoAprobadoAnual", label: "Presupuesto aprobado anual", tipo: "numero", expr: `p."presupuestoAprobadoAnual"` },
    ],
  },
  {
    id: "siniestros",
    label: "Siniestros",
    from: `"Siniestro" s LEFT JOIN "Unidad" u ON u."numeroEconomico" = s."numeroEconomico" LEFT JOIN "Proyecto" p ON p.id = u."proyectoId"`,
    proyectoScopeExpr: `u."proyectoId"`,
    tablasBase: ["Siniestro", "Unidad", "Proyecto"],
    campos: [
      {
        id: "tipo",
        label: "Tipo de siniestro",
        tipo: "texto",
        expr: `s."tipo"`,
        opciones: [
          { valor: "COLISION", label: "Colisión" },
          { valor: "ROBO_TOTAL", label: "Robo total" },
          { valor: "ROBO_PARCIAL", label: "Robo parcial" },
          { valor: "VANDALISMO", label: "Vandalismo" },
          { valor: "INCENDIO", label: "Incendio" },
          { valor: "FENOMENO_NATURAL", label: "Fenómeno natural" },
          { valor: "OTRO", label: "Otro" },
        ],
      },
      {
        id: "estatus",
        label: "Estatus",
        tipo: "texto",
        expr: `s."estatus"`,
        opciones: [
          { valor: "ABIERTO", label: "Abierto" },
          { valor: "EN_PROCESO", label: "En proceso" },
          { valor: "CERRADO", label: "Cerrado" },
          { valor: "CERRADO_SIN_INDEMNIZACION", label: "Cerrado sin indemnización" },
        ],
      },
      { id: "aseguradora", label: "Aseguradora", tipo: "texto", expr: `COALESCE(s."aseguradora", 'Sin aseguradora')` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `s."fecha"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `s."fecha"` },
      { id: "estimacionDanos", label: "Estimación de daños", tipo: "numero", expr: `s."estimacionDanos"` },
      { id: "costoArrastre", label: "Costo de arrastre", tipo: "numero", expr: `s."costoArrastre"` },
      { id: "costoReparacion", label: "Costo de reparación", tipo: "numero", expr: `s."costoReparacion"` },
    ],
  },
  {
    id: "accidentes",
    label: "Accidentes (legacy)",
    from: `"Accidente" a LEFT JOIN "Unidad" u ON u."numeroEconomico" = a."numeroEconomico" LEFT JOIN "Proyecto" p ON p.id = u."proyectoId"`,
    proyectoScopeExpr: `u."proyectoId"`,
    tablasBase: ["Accidente", "Unidad", "Proyecto"],
    campos: [
      { id: "tipo", label: "Tipo", tipo: "texto", expr: `a."tipo"` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `a."fecha"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `a."fecha"` },
    ],
  },
  {
    id: "tickets_rescate",
    label: "Tickets de rescate",
    from: `"TicketRescate" tr LEFT JOIN "CatalogoMotivoRescate" m ON m.id = tr."motivoId" LEFT JOIN "Proyecto" p ON p.id = tr."proyectoId"`,
    proyectoScopeExpr: `tr."proyectoId"`,
    tablasBase: ["TicketRescate", "CatalogoMotivoRescate", "Proyecto"],
    campos: [
      {
        id: "estatus",
        label: "Estatus",
        tipo: "texto",
        expr: `tr."estatus"`,
        opciones: [
          { valor: "ABIERTO", label: "Abierto" },
          { valor: "ASIGNADO", label: "Asignado" },
          { valor: "EN_ATENCION", label: "En atención" },
          { valor: "EN_TRANSITO", label: "En tránsito" },
          { valor: "RESUELTO", label: "Resuelto" },
          { valor: "CERRADO", label: "Cerrado" },
          { valor: "CANCELADO", label: "Cancelado" },
        ],
      },
      {
        id: "prioridad",
        label: "Prioridad",
        tipo: "texto",
        expr: `tr."prioridad"`,
        opciones: [
          { valor: "BAJA", label: "Baja" },
          { valor: "MEDIA", label: "Media" },
          { valor: "ALTA", label: "Alta" },
          { valor: "URGENTE", label: "Urgente" },
        ],
      },
      {
        id: "categoria",
        label: "Categoría del motivo",
        tipo: "texto",
        expr: `m."categoria"`,
        opciones: [
          { valor: "MECANICO", label: "Mecánico" },
          { valor: "ELECTRICO", label: "Eléctrico" },
          { valor: "NEUMATICO", label: "Neumático" },
          { valor: "ACCIDENTE", label: "Accidente" },
          { valor: "SEGURIDAD", label: "Seguridad" },
          { valor: "COMBUSTIBLE", label: "Combustible" },
          { valor: "OTRO", label: "Otro" },
        ],
      },
      { id: "motivo", label: "Motivo", tipo: "texto", expr: `COALESCE(m."nombre", 'Sin motivo')` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes de creación", tipo: "fecha_mes", expr: `tr."createdAt"` },
      { id: "dia", label: "Día de creación", tipo: "fecha_dia", expr: `tr."createdAt"` },
    ],
  },
  {
    id: "checklist",
    label: "Checklist de unidades",
    from: `"Checklist" ch LEFT JOIN "Unidad" u ON u."numeroEconomico" = ch."numeroEconomico" LEFT JOIN "Proyecto" p ON p.id = u."proyectoId"`,
    proyectoScopeExpr: `u."proyectoId"`,
    tablasBase: ["Checklist", "Unidad", "Proyecto"],
    campos: [
      { id: "tipo", label: "Tipo", tipo: "texto", expr: `ch."tipo"`, opciones: [{ valor: "DIARIO", label: "Diario" }, { valor: "SEMANAL", label: "Semanal" }] },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `ch."fecha"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `ch."fecha"` },
      { id: "odometro", label: "Odómetro", tipo: "numero", expr: `ch."odometro"` },
    ],
  },
  {
    id: "gps_posiciones",
    label: "Posiciones GPS",
    from: `"PosicionGPS" g LEFT JOIN "Unidad" u ON u."numeroEconomico" = g."numeroEconomico" LEFT JOIN "Proyecto" p ON p.id = u."proyectoId"`,
    proyectoScopeExpr: `u."proyectoId"`,
    // Volumen potencialmente alto (telemetría): úsese preferentemente con
    // ejeX de fecha (mes/día) — LIMITE_DISPERSION en route.ts ya acota el
    // caso de dispersión sin agrupar.
    tablasBase: ["PosicionGPS", "Unidad", "Proyecto"],
    campos: [
      { id: "fuente", label: "Fuente", tipo: "texto", expr: `g."fuente"::text`, opciones: [{ valor: "API", label: "API" }, { valor: "WEBHOOK", label: "Webhook" }] },
      {
        id: "esAnomalo",
        label: "Anomalía",
        tipo: "texto",
        expr: `CASE WHEN g."esAnomalo" THEN 'Anómalo' ELSE 'Normal' END`,
        opciones: [{ valor: "Anómalo", label: "Anómalo" }, { valor: "Normal", label: "Normal" }],
      },
      { id: "motivoAnomalia", label: "Motivo de anomalía", tipo: "texto", expr: `COALESCE(g."motivoAnomalia"::text, 'N/A')` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `g."timestamp"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `g."timestamp"` },
      { id: "velocidad", label: "Velocidad", tipo: "numero", expr: `g."velocidad"` },
    ],
  },
  {
    id: "gps_huecos_senal",
    label: "Huecos de señal GPS",
    from: `"HuecoSenalGPS" h LEFT JOIN "Unidad" u ON u."numeroEconomico" = h."numeroEconomico" LEFT JOIN "Proyecto" p ON p.id = u."proyectoId"`,
    proyectoScopeExpr: `u."proyectoId"`,
    tablasBase: ["HuecoSenalGPS", "Unidad", "Proyecto"],
    campos: [
      {
        id: "patronRecurrente",
        label: "Patrón",
        tipo: "texto",
        expr: `CASE WHEN h."patronRecurrente" THEN 'Recurrente' ELSE 'Aislado' END`,
        opciones: [{ valor: "Recurrente", label: "Recurrente" }, { valor: "Aislado", label: "Aislado" }],
      },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes de inicio", tipo: "fecha_mes", expr: `h."timestampInicio"` },
      { id: "dia", label: "Día de inicio", tipo: "fecha_dia", expr: `h."timestampInicio"` },
      { id: "duracionMinutos", label: "Duración (minutos)", tipo: "numero", expr: `h."duracionMinutos"` },
    ],
  },
  {
    id: "inventario_insumos",
    label: "Consumo de insumos",
    from: `"ConsumoInsumo" ci LEFT JOIN "InsumoInventario" i ON i.id = ci."insumoId" LEFT JOIN "Proyecto" p ON p.id = i."proyectoId"`,
    proyectoScopeExpr: `i."proyectoId"`,
    tablasBase: ["ConsumoInsumo", "InsumoInventario", "Proyecto"],
    campos: [
      { id: "insumo", label: "Insumo", tipo: "texto", expr: `COALESCE(i."nombre", 'Sin insumo')` },
      { id: "categoria", label: "Categoría", tipo: "texto", expr: `COALESCE(i."categoria", 'Sin categoría')` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `ci."fecha"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `ci."fecha"` },
      { id: "cantidad", label: "Cantidad consumida", tipo: "numero", expr: `ci."cantidad"` },
    ],
  },
  {
    id: "historico_proyecto",
    label: "Histórico de reasignación de unidades",
    from: `"UnidadHistoricoProyecto" h LEFT JOIN "Proyecto" p ON p.id = h."proyectoId"`,
    proyectoScopeExpr: `h."proyectoId"`,
    tablasBase: ["UnidadHistoricoProyecto", "Proyecto"],
    campos: [
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      {
        id: "activo",
        label: "Vigencia",
        tipo: "texto",
        expr: `CASE WHEN h."fechaFin" IS NULL THEN 'Activo' ELSE 'Finalizado' END`,
        opciones: [{ valor: "Activo", label: "Activo" }, { valor: "Finalizado", label: "Finalizado" }],
      },
      { id: "mesInicio", label: "Mes de inicio", tipo: "fecha_mes", expr: `h."fechaInicio"` },
      { id: "diaInicio", label: "Día de inicio", tipo: "fecha_dia", expr: `h."fechaInicio"` },
    ],
  },
];

export function obtenerDataset(id: string): DatasetMeta | undefined {
  return BI_DATASETS.find((d) => d.id === id);
}

export function obtenerCampo(dataset: DatasetMeta, id: string): CampoMeta | undefined {
  return dataset.campos.find((c) => c.id === id);
}

/** Agregaciones permitidas para un campo: conteo siempre; suma/promedio solo en campos numéricos. */
export function agregacionesDisponibles(campo: CampoMeta): TipoAgregacion[] {
  return campo.tipo === "numero" ? ["conteo", "suma", "promedio"] : ["conteo"];
}

export const AGREGACION_LABEL: Record<TipoAgregacion, string> = {
  conteo: "Conteo",
  suma: "Suma",
  promedio: "Promedio",
};

export type TipoOrden = "dimension" | "valor_desc" | "valor_asc";

/** Un filtro: OR entre `valores` del mismo campo, AND entre filtros distintos del arreglo. */
export type FiltroGuardable = { campoId: string; valores: string[] };

export type CombinacionGuardable = {
  label: string;
  dataset: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  tipoGrafica: TipoGrafica;
  /** Segundo campo de agrupación — obligatorio en "piramide" (máx. 2 categorías),
   *  opcional en "barras" (cruce de 2 dimensiones, sin tope de categorías). */
  ejeSplit?: string;
  /** Orden de las categorías — solo aplica a barras/puntos/divergente. */
  orden?: TipoOrden;
  /** Filtros adicionales (narrows el conjunto de filas antes de agrupar). Ausente/[] = sin filtro. */
  filtros?: FiltroGuardable[];
  /** Proyectos elegidos por quien arma el widget. Ausente = "Nacional" (todos los
   *  proyectos permitidos por su rol). SIEMPRE se intersecta en el servidor con
   *  proyectosPermitidosParaModulo("M") — nunca se confía en este valor tal cual. */
  proyectoIds?: string[];
  /** Cross-filter: al hacer clic en una categoría de este widget, emite un
   *  filtro de interacción (mismo mecanismo que `filtros` — un `Filtro` más
   *  que /api/bi/query valida igual que cualquier otro, cero superficie
   *  nueva) que se ofrece a los widgets marcados `escuchaFiltro`. */
  emiteFiltro?: boolean;
  /** Si hay un filtro de interacción activo (de algún widget `emiteFiltro`)
   *  y su campo existe en el dataset de este widget, se fusiona con sus
   *  `filtros` propios antes de consultar. Si no existe, se ignora en
   *  silencio para este widget — nunca rompe la consulta. */
  escuchaFiltro?: boolean;
};

/** Combinaciones curadas de arranque (MVP), antes de abrir el selector libre. */
export const BI_COMBINACIONES_SUGERIDAS: CombinacionGuardable[] = [
  { label: "Unidades por estatus", dataset: "unidades", ejeX: "estatus", ejeY: "estatus", agregacion: "conteo", tipoGrafica: "barras" },
  { label: "Unidades por proyecto", dataset: "unidades", ejeX: "proyecto", ejeY: "proyecto", agregacion: "conteo", tipoGrafica: "barras" },
  { label: "Gasto de mantenimiento por categoría", dataset: "mantenimiento", ejeX: "categoria", ejeY: "costo", agregacion: "suma", tipoGrafica: "barras" },
  { label: "Gasto de mantenimiento por mes", dataset: "mantenimiento", ejeX: "mes", ejeY: "costo", agregacion: "suma", tipoGrafica: "lineas" },
  { label: "Litros de combustible por mes", dataset: "combustible", ejeX: "mes", ejeY: "litros", agregacion: "suma", tipoGrafica: "lineas" },
  { label: "Pólizas por aseguradora", dataset: "seguros", ejeX: "aseguradora", ejeY: "aseguradora", agregacion: "conteo", tipoGrafica: "pie" },
  { label: "Operadores por estatus documental", dataset: "operadores", ejeX: "estatusDocumental", ejeY: "estatusDocumental", agregacion: "conteo", tipoGrafica: "pie" },
  { label: "Documentos por vencer por tipo", dataset: "documentos_operador", ejeX: "tipoDocumento", ejeY: "tipoDocumento", agregacion: "conteo", tipoGrafica: "barras" },
  { label: "Gasto de peajes por mes", dataset: "peajes", ejeX: "mes", ejeY: "monto", agregacion: "suma", tipoGrafica: "lineas" },
  { label: "Presupuesto autorizado por categoría", dataset: "presupuesto_partida", ejeX: "categoria", ejeY: "montoPresupuestado", agregacion: "suma", tipoGrafica: "barras" },
  { label: "Unidades por año modelo", dataset: "unidades", ejeX: "anio", ejeY: "anio", agregacion: "conteo", tipoGrafica: "barras" },
  { label: "Rendimiento promedio por marca", dataset: "unidades", ejeX: "marca", ejeY: "rendimientoPromedio", agregacion: "promedio", tipoGrafica: "barras" },
  { label: "Unidades por propietario", dataset: "unidades", ejeX: "propietario", ejeY: "propietario", agregacion: "conteo", tipoGrafica: "pie" },
  { label: "Proyectos por estado de la república", dataset: "proyectos", ejeX: "estadoRepublica", ejeY: "estadoRepublica", agregacion: "conteo", tipoGrafica: "barras" },
  { label: "Total de unidades", dataset: "unidades", ejeX: "estatus", ejeY: "estatus", agregacion: "conteo", tipoGrafica: "contador" },
  { label: "Gasto total de mantenimiento", dataset: "mantenimiento", ejeX: "categoria", ejeY: "costo", agregacion: "suma", tipoGrafica: "contador" },
  { label: "Costo de mantenimiento por proveedor", dataset: "mantenimiento", ejeX: "proveedor", ejeY: "costo", agregacion: "suma", tipoGrafica: "puntos", orden: "valor_desc" },
  { label: "Km oficial vs. promedio, por marca", dataset: "unidades", ejeX: "marca", ejeY: "kmOficial", agregacion: "promedio", tipoGrafica: "divergente" },
  { label: "Distribución de rendimiento promedio", dataset: "unidades", ejeX: "rendimientoPromedio", ejeY: "rendimientoPromedio", agregacion: "conteo", tipoGrafica: "histograma" },
  { label: "Km oficial vs. rendimiento", dataset: "unidades", ejeX: "kmOficial", ejeY: "rendimientoPromedio", agregacion: "conteo", tipoGrafica: "dispersion" },
  { label: "Cargas de combustible por día", dataset: "combustible", ejeX: "dia", ejeY: "litros", agregacion: "suma", tipoGrafica: "calendario" },
  { label: "Distribución de costo por categoría", dataset: "mantenimiento", ejeX: "categoria", ejeY: "costo", agregacion: "conteo", tipoGrafica: "caja" },
  { label: "Peajes por proyecto y proveedor de TAG", dataset: "peajes", ejeX: "proyecto", ejeY: "monto", agregacion: "suma", tipoGrafica: "piramide", ejeSplit: "proveedorTag" },
  { label: "Unidades por estado (origen de placa)", dataset: "unidades", ejeX: "origenPlaca", ejeY: "origenPlaca", agregacion: "conteo", tipoGrafica: "mapa" },
];

/** Posición/tamaño en la cuadrícula de arrastre (react-grid-layout), en unidades de columna/fila. */
export type LayoutWidget = { x: number; y: number; w: number; h: number };

export type WidgetDashboardBI = CombinacionGuardable & {
  id: string;
  layout: LayoutWidget;
};

const ANCHO_DEFAULT = [4, 4, 6, 6, 6, 4]; // en una cuadrícula de 12 columnas
const ALTO_DEFAULT = 9;
const COLS_DEFAULT = 12;

export const WIDGETS_BI_DEFAULT: WidgetDashboardBI[] = BI_COMBINACIONES_SUGERIDAS.map((c, i) => {
  const w = ANCHO_DEFAULT[i % ANCHO_DEFAULT.length];
  const porFila = Math.floor(COLS_DEFAULT / w) || 1;
  const fila = Math.floor(i / porFila);
  const col = (i % porFila) * w;
  return {
    id: `default-${i}`,
    label: c.label,
    dataset: c.dataset,
    ejeX: c.ejeX,
    ejeY: c.ejeY,
    agregacion: c.agregacion,
    tipoGrafica: c.tipoGrafica,
    layout: { x: col, y: fila * ALTO_DEFAULT, w, h: ALTO_DEFAULT },
  };
});
