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

// Sentinelas para un filtro de mes "siempre vigente" (ej. preset "Mes
// actual" en el selector de BI, src/components/bi/selectores-combinacion.tsx):
// en vez de guardar en el widget un valor fijo como "2026-09" (que se queda
// congelado al mes en que se guardó/editó por última vez), se guarda este
// texto y motor-consultas.ts lo resuelve al mes real EN CADA consulta — así
// el widget siempre refleja el mes/mes anterior en curso sin que nadie tenga
// que reabrirlo y volver a elegirlo cada mes. Viven aquí (no en
// motor-consultas.ts, que importa Prisma) para que el componente cliente que
// arma el filtro pueda usar el mismo valor sin arrastrar dependencias de servidor.
export const SENTINEL_MES_ACTUAL = "__MES_ACTUAL__";
export const SENTINEL_MES_ANTERIOR = "__MES_ANTERIOR__";

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
  | "mapa"
  | "avance";

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
  avance: "Barra de avance (valor vs. meta)",
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
export const REQUISITOS_TIPO_GRAFICA: Record<
  TipoGrafica,
  { ejeX: RequisitoCampo; ejeY: RequisitoCampo; ejeSplit?: { tipos: RequisitoCampo; obligatorio: boolean }; ejeMeta?: RequisitoCampo }
> = {
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
  // "Valor" y "meta" siempre se suman (no aplica conteo/promedio) — una barra
  // de avance compara dos montos totales, no una distribución.
  avance: { ejeX: "cualquiera", ejeY: ["numero"], ejeMeta: ["numero"] },
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
  /** Se agrega al formatear el valor de este campo cuando es el eje Y (ej. "%") — no aplica cuando la agregación es "conteo" (ahí el valor es N° de registros, no el campo). */
  sufijo?: string;
  /** Restringe qué agregaciones tienen sentido para este campo (por defecto: las del tipo). Ej. un porcentaje como SLA solo se puede promediar — sumarlo o contarlo no significa nada y confunde (se ve como "N° de registros", sin el sufijo). */
  agregacionesPermitidas?: TipoAgregacion[];
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
      // Máxima granularidad posible (1 fila = 1 unidad) — útil como eje X
      // para ver un campo "por unidad" en vez de agrupado/promediado, igual
      // que se ve en la tabla de Inventario de Unidades (ej. SLA de
      // disponibilidad de cada unidad, no el promedio de su proyecto).
      { id: "numeroEconomico", label: "Número económico", tipo: "texto", expr: `u."numeroEconomico"` },
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `u."estatus"`, opciones: opcionesDe(ESTATUS_UNIDAD_LABEL) },
      {
        id: "disponibilidad",
        label: "Disponibilidad",
        tipo: "texto",
        expr: `CASE WHEN u."disponibilidad" THEN 'Disponible' ELSE 'No disponible' END`,
        opciones: [{ valor: "Disponible", label: "Disponible" }, { valor: "No disponible", label: "No disponible" }],
      },
      {
        id: "motivoIndisponibilidad",
        label: "Motivo de no disponibilidad",
        tipo: "texto",
        // NULL para las disponibles: el motor de consultas descarta filas con
        // dimensión NULL, así que agrupar por este campo muestra solo el
        // desglose de las no disponibles — igual que "Unidades no
        // disponibles" del reporte de Estatus de flota.
        expr: `CASE WHEN u."disponibilidad" THEN NULL ELSE
          CASE u."motivoIndisponibilidad"
            WHEN 'MANTENIMIENTO' THEN 'Mantenimiento'
            WHEN 'SINIESTRO' THEN 'Siniestro'
            WHEN 'SIN_OPERADOR' THEN 'Sin operador asignado'
            WHEN 'TRAMITE_DOCUMENTACION' THEN 'Trámite / documentación'
            WHEN 'SIN_COMBUSTIBLE' THEN 'Falta de combustible'
            WHEN 'OTRO' THEN 'Otro'
            ELSE 'Sin motivo registrado'
          END
        END`,
        opciones: [
          { valor: "Mantenimiento", label: "Mantenimiento" },
          { valor: "Siniestro", label: "Siniestro" },
          { valor: "Sin operador asignado", label: "Sin operador asignado" },
          { valor: "Trámite / documentación", label: "Trámite / documentación" },
          { valor: "Falta de combustible", label: "Falta de combustible" },
          { valor: "Otro", label: "Otro" },
          { valor: "Sin motivo registrado", label: "Sin motivo registrado" },
        ],
      },
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
      {
        id: "kmOficial",
        label: "Km oficial",
        tipo: "numero",
        expr: `u."kmOficial"`,
        sufijo: " km",
        // Lectura de odómetro por unidad, no una cantidad que se acumule
        // entre unidades — sumar los km de varias unidades no significa
        // nada (ni es "distancia recorrida por la flota"); solo promediarlo
        // tiene sentido (ej. "km oficial promedio por marca").
        agregacionesPermitidas: ["promedio"],
      },
      {
        id: "rendimientoPromedio",
        label: "Rendimiento promedio",
        tipo: "numero",
        expr: `u."rendimientoPromedio"`,
        sufijo: " km/L",
        // Ya es un promedio por unidad — sumarlo entre unidades no
        // representa nada real, solo promediarlo (promedio de promedios).
        agregacionesPermitidas: ["promedio"],
      },
      {
        id: "capacidadTanqueLitros",
        label: "Capacidad de tanque (litros)",
        tipo: "numero",
        expr: `u."capacidadTanqueLitros"`,
        sufijo: " L",
        // A diferencia de km/rendimiento, sumar sí tiene un significado real
        // (capacidad total de tanque de la flota/grupo) — se deja además de
        // promedio; "conteo" se excluye porque ignoraría el campo.
        agregacionesPermitidas: ["suma", "promedio"],
      },
      {
        id: "slaDisponibilidad",
        label: "SLA de disponibilidad (% mes en curso)",
        tipo: "numero",
        sufijo: "%",
        // Solo tiene sentido promediarlo: "conteo" ignoraría el campo (N° de
        // registros, sin %) y "suma" de porcentajes entre unidades no
        // significa nada — forzar "promedio" evita el resultado confuso de
        // dejar la agregación en su valor por defecto ("conteo").
        agregacionesPermitidas: ["promedio"],
        // Réplica en SQL de calcularSlaEnRango (src/lib/sla-disponibilidad.ts)
        // para el mes en curso: de los periodos de HistoricoDisponibilidadUnidad
        // que se traslapan con [inicio de mes, ahora], qué fracción del tiempo
        // la unidad estuvo disponible. NULL si la unidad no tiene historial en
        // el rango (unidad recién dada de alta este mes, por ejemplo) — el
        // motor de consultas ya descarta NULL al promediar/agrupar.
        expr: `(
          SELECT CASE WHEN COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (
              LEAST(COALESCE(h."hasta", NOW()), NOW()) - GREATEST(h."desde", date_trunc('month', NOW()))
            )))), 0) > 0
          THEN ROUND(
            (100.0 * SUM(CASE WHEN h."disponible" THEN GREATEST(0, EXTRACT(EPOCH FROM (
              LEAST(COALESCE(h."hasta", NOW()), NOW()) - GREATEST(h."desde", date_trunc('month', NOW()))
            ))) ELSE 0 END)
            / SUM(GREATEST(0, EXTRACT(EPOCH FROM (
              LEAST(COALESCE(h."hasta", NOW()), NOW()) - GREATEST(h."desde", date_trunc('month', NOW()))
            )))))::numeric
          , 1)
          ELSE NULL END
          FROM "HistoricoDisponibilidadUnidad" h
          WHERE h."numeroEconomico" = u."numeroEconomico"
            AND h."desde" < NOW()
            AND (h."hasta" IS NULL OR h."hasta" > date_trunc('month', NOW()))
        )`,
      },
      {
        id: "disponibilidadPct",
        label: "% de disponibilidad (actual)",
        tipo: "numero",
        sufijo: "%",
        // 100/0 por unidad — promediarlo grupo por grupo da exactamente
        // "disponibles / total" de ese grupo (ej. por proyecto), igual que
        // la columna Disponibilidad de Inventario de Unidades.
        agregacionesPermitidas: ["promedio"],
        expr: `CASE WHEN u."disponibilidad" THEN 100 ELSE 0 END`,
      },
      {
        id: "unidadesDisponiblesConteo",
        label: "Unidades disponibles (para barra de avance)",
        tipo: "numero",
        // Sin sufijo: es un conteo crudo, pensado como "valor" de una barra
        // de avance contra "unidadesConteo" como "meta" — no para verse solo.
        agregacionesPermitidas: ["suma"],
        expr: `CASE WHEN u."disponibilidad" THEN 1 ELSE 0 END`,
      },
      {
        id: "unidadesConteo",
        label: "Unidades (para barra de avance)",
        tipo: "numero",
        agregacionesPermitidas: ["suma"],
        expr: `1`,
      },
    ],
  },
  {
    id: "mantenimiento",
    label: "Mantenimiento y gastos",
    // El proyecto de un gasto puede venir de la unidad (u."proyectoId") o,
    // si no aplica a una unidad (ej. viáticos de operación), directo de
    // proyectoReportanteId — se combinan con COALESCE para no perder ninguno.
    from: `"GastoVehicular" g LEFT JOIN "Unidad" u ON u."numeroEconomico" = g."numeroEconomico" LEFT JOIN "Proyecto" p ON p.id = COALESCE(u."proyectoId", g."proyectoReportanteId")`,
    proyectoScopeExpr: `COALESCE(u."proyectoId", g."proyectoReportanteId")`,
    tablasBase: ["GastoVehicular", "Unidad", "Proyecto"],
    campos: [
      { id: "categoria", label: "Categoría de gasto", tipo: "texto", expr: `g."categoria"`, opciones: opcionesDe(CATEGORIA_GASTO_LABEL) },
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `g."estatus"`, opciones: opcionesDe(ESTATUS_GASTO_LABEL) },
      { id: "proveedor", label: "Proveedor", tipo: "texto", expr: `COALESCE(g."proveedor", 'Sin proveedor')` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `g."fecha"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `g."fecha"` },
      { id: "costo", label: "Costo", tipo: "numero", expr: `g."costo"`, sufijo: " MXN" },
    ],
  },
  {
    id: "combustible",
    label: "Combustible",
    // Igual que en mantenimiento: el proyecto viene de la unidad o, si la
    // carga no tiene unidad (gasto operativo), de proyectoReportanteId.
    from: `"Combustible" c LEFT JOIN "Unidad" u3 ON u3."numeroEconomico" = c."numeroEconomico" LEFT JOIN "Proyecto" p ON p.id = COALESCE(u3."proyectoId", c."proyectoReportanteId")`,
    proyectoScopeExpr: `COALESCE(u3."proyectoId", c."proyectoReportanteId")`,
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
      { id: "litros", label: "Litros", tipo: "numero", expr: `c."litros"`, sufijo: " L" },
      { id: "costo", label: "Costo", tipo: "numero", expr: `c."costo"`, sufijo: " MXN" },
      {
        id: "rendimientoCalculado",
        label: "Rendimiento",
        tipo: "numero",
        expr: `c."rendimientoCalculado"`,
        sufijo: " km/L",
        // Ya es un cálculo por carga (km/L) — sumarlo entre cargas no
        // representa nada, solo promediarlo.
        agregacionesPermitidas: ["promedio"],
      },
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
      { id: "costo", label: "Costo", tipo: "numero", expr: `s."costo"`, sufijo: " MXN" },
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
    // Igual que en mantenimiento/combustible: el proyecto viene de la unidad
    // o, si el peaje no tiene unidad (gasto operativo), de proyectoReportanteId.
    from: `"Tag" t LEFT JOIN "Unidad" u ON u."numeroEconomico" = t."numeroEconomico" LEFT JOIN "Proyecto" p ON p.id = COALESCE(u."proyectoId", t."proyectoReportanteId")`,
    proyectoScopeExpr: `COALESCE(u."proyectoId", t."proyectoReportanteId")`,
    tablasBase: ["Tag", "Unidad", "Proyecto"],
    campos: [
      { id: "proveedorTag", label: "Proveedor de TAG", tipo: "texto", expr: `t."proveedorTag"`, opciones: [{ valor: "IAVE", label: "IAVE" }, { valor: "PASE", label: "PASE" }, { valor: "TELEVIA", label: "Televía" }] },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `t."fecha"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `t."fecha"` },
      { id: "monto", label: "Monto", tipo: "numero", expr: `t."monto"`, sufijo: " MXN" },
    ],
  },
  {
    id: "presupuesto_partida",
    label: "Presupuesto por partida (autorizado)",
    // "pp" ya NO es directamente la tabla PresupuestoPartida: es un producto
    // cruzado de todo proyecto × toda categoría × todo (año, mes) que tenga
    // gasto real O presupuesto capturado, con el monto presupuestado pegado
    // por LEFT JOIN (0 si no existe). Antes "pp" era la tabla real y una
    // combinación proyecto/categoría/mes SIN presupuesto capturado
    // simplemente no generaba fila — así que su gasto real (que si existe,
    // vía las subconsultas de "gastoReal" más abajo) quedaba invisible en
    // este dataset aunque SÍ se contara en /proyectos (obtenerResumenPresupuestoPorPartida,
    // que siempre recorre las 13 categorías). Con esto, un proyecto que gastó
    // en una categoría sin presupuesto asignado ese mes ya no desaparece del
    // dashboard.
    from: `(
      SELECT proy.id AS "proyectoId", cat.categoria, meses.anio, meses.mes,
             COALESCE(pp2."montoPresupuestado", 0) AS "montoPresupuestado"
      FROM "Proyecto" proy
      CROSS JOIN (SELECT unnest(enum_range(NULL::"CategoriaGasto")) AS categoria) cat
      CROSS JOIN (
        SELECT anio, mes FROM (
          SELECT EXTRACT(YEAR FROM fecha)::int AS anio, EXTRACT(MONTH FROM fecha)::int AS mes FROM "GastoVehicular"
          UNION SELECT EXTRACT(YEAR FROM fecha)::int, EXTRACT(MONTH FROM fecha)::int FROM "Combustible"
          UNION SELECT EXTRACT(YEAR FROM fecha)::int, EXTRACT(MONTH FROM fecha)::int FROM "Tag"
          UNION SELECT anio, mes FROM "PresupuestoPartida"
        ) todos_los_meses
        GROUP BY anio, mes
      ) meses
      LEFT JOIN "PresupuestoPartida" pp2
        ON pp2."proyectoId" = proy.id AND pp2.categoria = cat.categoria AND pp2.anio = meses.anio AND pp2.mes = meses.mes
    ) pp LEFT JOIN "Proyecto" p ON p.id = pp."proyectoId"`,
    proyectoScopeExpr: `pp."proyectoId"`,
    // Incluye GastoVehicular/Combustible/Tag/Unidad porque el campo
    // "gastoReal" los lee vía subconsulta correlacionada (y ahora también el
    // universo de meses de "pp") — un gasto nuevo debe invalidar la caché de
    // este dataset igual que uno nuevo en PresupuestoPartida.
    tablasBase: ["PresupuestoPartida", "Proyecto", "GastoVehicular", "Combustible", "Tag", "Unidad"],
    campos: [
      { id: "categoria", label: "Categoría de gasto", tipo: "texto", expr: `pp."categoria"`, opciones: opcionesDe(CATEGORIA_GASTO_LABEL) },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `make_date(pp."anio", pp."mes", 1)` },
      { id: "montoPresupuestado", label: "Monto presupuestado", tipo: "numero", expr: `pp."montoPresupuestado"`, sufijo: " MXN" },
      {
        id: "gastoReal",
        label: "Gasto real",
        tipo: "numero",
        sufijo: " MXN",
        agregacionesPermitidas: ["suma"],
        // Réplica en SQL de obtenerResumenPresupuestoPorPartida
        // (src/lib/presupuesto.ts): el origen del gasto real NO es uniforme
        // por categoría — Gasolina sale de Combustible, Casetas de Tag, el
        // resto de GastoVehicular — para la MISMA combinación proyecto +
        // categoría + año + mes que esta partida. A diferencia del resto de
        // datasets de este catálogo (que atribuyen por el proyecto ACTUAL de
        // la unidad), aquí SÍ se replica la atribución histórica exacta del
        // original (vía UnidadHistoricoProyecto: el gasto cuenta para este
        // proyecto solo si la unidad estuvo asignada a él en la fecha del
        // gasto) — un dato financiero de "ejecución presupuestal" que se
        // aparta demasiado del oficial (~2-3x en unidades reasignadas) no es
        // aceptable, aunque cueste una subconsulta más cara.
        expr: `(
          CASE pp."categoria"
            WHEN 'GASOLINA' THEN (
              SELECT COALESCE(SUM(c."costo"), 0) FROM "Combustible" c
              WHERE (
                c."proyectoReportanteId" = pp."proyectoId"
                OR EXISTS (
                  SELECT 1 FROM "UnidadHistoricoProyecto" h
                  WHERE h."numeroEconomico" = c."numeroEconomico" AND h."proyectoId" = pp."proyectoId"
                    AND h."fechaInicio" <= c."fecha" AND (h."fechaFin" IS NULL OR h."fechaFin" > c."fecha")
                )
              )
              AND EXTRACT(YEAR FROM c."fecha") = pp."anio" AND EXTRACT(MONTH FROM c."fecha") = pp."mes"
            )
            WHEN 'CASETAS' THEN (
              SELECT COALESCE(SUM(t."monto"), 0) FROM "Tag" t
              WHERE (
                t."proyectoReportanteId" = pp."proyectoId"
                OR EXISTS (
                  SELECT 1 FROM "UnidadHistoricoProyecto" h
                  WHERE h."numeroEconomico" = t."numeroEconomico" AND h."proyectoId" = pp."proyectoId"
                    AND h."fechaInicio" <= t."fecha" AND (h."fechaFin" IS NULL OR h."fechaFin" > t."fecha")
                )
              )
              AND EXTRACT(YEAR FROM t."fecha") = pp."anio" AND EXTRACT(MONTH FROM t."fecha") = pp."mes"
            )
            WHEN 'VIATICOS_OPERACION' THEN (
              -- Sin unidad (reportado directo al proyecto) — nunca vía historico.
              SELECT COALESCE(SUM(g."costo"), 0) FROM "GastoVehicular" g
              WHERE g."categoria" = 'VIATICOS_OPERACION' AND g."proyectoReportanteId" = pp."proyectoId"
                AND EXTRACT(YEAR FROM g."fecha") = pp."anio" AND EXTRACT(MONTH FROM g."fecha") = pp."mes"
            )
            ELSE (
              -- UnidadHistoricoProyecto está lejos de completo (cubre una
              -- fracción mínima de los gastos de Mantenimiento) — igual que
              -- Gasolina/Casetas arriba, se cae a proyectoReportanteId (ya
              -- grabado en el gasto al capturarlo) cuando no hay histórico
              -- que cubra la fecha. Sin este OR, el "gasto real" de estas
              -- categorías no cuadraba con obtenerResumenPresupuestoAnual.
              SELECT COALESCE(SUM(g."costo"), 0) FROM "GastoVehicular" g
              WHERE g."categoria" = pp."categoria"
                AND (
                  g."proyectoReportanteId" = pp."proyectoId"
                  OR EXISTS (
                    SELECT 1 FROM "UnidadHistoricoProyecto" h
                    WHERE h."numeroEconomico" = g."numeroEconomico" AND h."proyectoId" = pp."proyectoId"
                      AND h."fechaInicio" <= g."fecha" AND (h."fechaFin" IS NULL OR h."fechaFin" > g."fecha")
                  )
                )
                AND EXTRACT(YEAR FROM g."fecha") = pp."anio" AND EXTRACT(MONTH FROM g."fecha") = pp."mes"
            )
          END
        )`,
      },
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
      { id: "presupuestoAprobadoAnual", label: "Presupuesto aprobado anual", tipo: "numero", expr: `p."presupuestoAprobadoAnual"`, sufijo: " MXN" },
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
      { id: "estimacionDanos", label: "Estimación de daños", tipo: "numero", expr: `s."estimacionDanos"`, sufijo: " MXN" },
      { id: "costoArrastre", label: "Costo de arrastre", tipo: "numero", expr: `s."costoArrastre"`, sufijo: " MXN" },
      { id: "costoReparacion", label: "Costo de reparación", tipo: "numero", expr: `s."costoReparacion"`, sufijo: " MXN" },
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
      { id: "tipo", label: "Tipo", tipo: "texto", expr: `ch."tipo"`, opciones: [{ valor: "DIARIO", label: "Diario" }, { valor: "SEMANAL", label: "Semanal" }, { valor: "CARGA_COMBUSTIBLE", label: "Carga de combustible" }, { valor: "REPORTE_FALLA", label: "Reporte de falla" }] },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `ch."fecha"` },
      { id: "dia", label: "Día", tipo: "fecha_dia", expr: `ch."fecha"` },
      {
        id: "odometro",
        label: "Odómetro",
        tipo: "numero",
        expr: `ch."odometro"`,
        sufijo: " km",
        // Lectura de odómetro, no una cantidad acumulable entre unidades —
        // ver el mismo criterio en "kmOficial" del dataset de unidades.
        agregacionesPermitidas: ["promedio"],
      },
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
      {
        id: "velocidad",
        label: "Velocidad",
        tipo: "numero",
        expr: `g."velocidad"`,
        sufijo: " km/h",
        // Lectura instantánea por punto GPS — sumar velocidades de varios
        // puntos no significa nada, solo promediarla.
        agregacionesPermitidas: ["promedio"],
      },
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
      { id: "duracionMinutos", label: "Duración (minutos)", tipo: "numero", expr: `h."duracionMinutos"`, sufijo: " min" },
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

/** Agregaciones permitidas para un campo: conteo siempre; suma/promedio solo en campos numéricos — salvo que el campo restrinja explícitamente cuáles tienen sentido (`agregacionesPermitidas`). */
export function agregacionesDisponibles(campo: CampoMeta): TipoAgregacion[] {
  if (campo.agregacionesPermitidas) return campo.agregacionesPermitidas;
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
  /** Segundo campo NUMÉRICO (no de agrupación, como ejeSplit) — la "meta" contra
   *  la que se compara ejeY en una barra de avance (ej. presupuesto vs. gasto). */
  ejeMeta?: string;
  /** Orden de las categorías — solo aplica a barras/puntos/divergente. */
  orden?: TipoOrden;
  /** Solo con tipoGrafica "barras" simple (sin ejeSplit): orientación de las barras. Por defecto "vertical". Puramente visual — el servidor no lo usa, la consulta es idéntica en ambos casos. */
  orientacion?: "vertical" | "horizontal";
  /** Solo con tipoGrafica "avance": si un % alto es bueno (verde, ej. disponibilidad/SLA) o malo (rojo, ej. ejecución presupuestal). Por defecto "negativo". Puramente visual. */
  colorimetria?: "positivo" | "negativo";
  /** Con qué vista abre el widget por defecto, si soporta tabla (todas menos caja/piramide/contador/avance): "grafica" (por defecto) o "tabla". Puramente visual — el usuario igual puede alternar en cualquier momento. */
  vistaPreferida?: "grafica" | "tabla";
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
  { label: "Unidades por disponibilidad", dataset: "unidades", ejeX: "disponibilidad", ejeY: "disponibilidad", agregacion: "conteo", tipoGrafica: "pie" },
  { label: "Motivo de indisponibilidad", dataset: "unidades", ejeX: "motivoIndisponibilidad", ejeY: "motivoIndisponibilidad", agregacion: "conteo", tipoGrafica: "barras" },
  { label: "Unidades por proyecto", dataset: "unidades", ejeX: "proyecto", ejeY: "proyecto", agregacion: "conteo", tipoGrafica: "barras" },
  { label: "SLA de disponibilidad por proyecto", dataset: "unidades", ejeX: "proyecto", ejeY: "slaDisponibilidad", agregacion: "promedio", tipoGrafica: "barras" },
  { label: "SLA de disponibilidad por unidad", dataset: "unidades", ejeX: "numeroEconomico", ejeY: "slaDisponibilidad", agregacion: "promedio", tipoGrafica: "puntos", orden: "valor_asc" },
  { label: "Disponibilidad por proyecto (avance)", dataset: "unidades", ejeX: "proyecto", ejeY: "unidadesDisponiblesConteo", ejeMeta: "unidadesConteo", agregacion: "suma", tipoGrafica: "avance", colorimetria: "positivo" },
  { label: "Ejecución presupuestal por proyecto", dataset: "presupuesto_partida", ejeX: "proyecto", ejeY: "gastoReal", ejeMeta: "montoPresupuestado", agregacion: "suma", tipoGrafica: "avance", colorimetria: "negativo" },
  { label: "Gasto del mes en curso por proyecto", dataset: "presupuesto_partida", ejeX: "proyecto", ejeY: "gastoReal", ejeMeta: "montoPresupuestado", agregacion: "suma", tipoGrafica: "avance", colorimetria: "negativo", filtros: [{ campoId: "mes", valores: [SENTINEL_MES_ACTUAL] }] },
  { label: "Ejecución presupuestal por concepto", dataset: "presupuesto_partida", ejeX: "categoria", ejeY: "gastoReal", ejeMeta: "montoPresupuestado", agregacion: "suma", tipoGrafica: "avance", colorimetria: "negativo" },
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
    ejeMeta: c.ejeMeta,
    orientacion: c.orientacion,
    colorimetria: c.colorimetria,
    vistaPreferida: c.vistaPreferida,
    agregacion: c.agregacion,
    tipoGrafica: c.tipoGrafica,
    layout: { x: col, y: fila * ALTO_DEFAULT, w, h: ALTO_DEFAULT },
  };
});
