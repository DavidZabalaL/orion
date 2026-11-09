// Ejecución del Comparador (métricas × periodos) en servidor. Reutiliza el
// whitelist del motor BI (dataset/campo/agregación/filtros) y su alcance de
// proyecto por permisos; nunca arma SQL con nombres que vengan del cliente.
// Una sola consulta por métrica: cada periodo es una columna con
// `AGG(...) FILTER (WHERE fecha BETWEEN ...)`, y el desglose + total salen
// juntos con GROUPING SETS — evita N consultas por periodo (ver incidente de
// cuota de Neon).
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cachearConsultaBI } from "@/lib/bi/cache";
import { obtenerDataset, obtenerCampo, agregacionesDisponibles, type TipoAgregacion, type FiltroGuardable } from "@/lib/bi/metadata";
import { campoExpr, metricaExpr, construirWhere, resolverAlcanceProyecto, proyectosEfectivos, ejeYSufijo, MAX_FILTROS } from "@/lib/bi/motor-consultas";
import { calcularSlaPorUnidadesEnRangos } from "@/lib/sla-disponibilidad";
import { validarReglasColor } from "@/lib/bi/reglas-color";
import { parseFechaLocalMx, finDelDiaMx } from "@/lib/timezone";
import {
  DATASETS_COMPARABLES,
  CAMPO_DESGLOSE,
  ATAJO_LABEL,
  MAX_METRICAS,
  MIN_PERIODOS,
  MAX_PERIODOS,
  MAX_FILAS_DESGLOSE,
  fechaValida,
  nombreMetrica,
  type AtajoPeriodo,
  type ConfigComparador,
  type Desglose,
  type FilaComparador,
  type MetricaComparador,
  type PeriodoComparador,
  type ResultadoMetricaComparador,
} from "@/lib/bi/comparador-tipos";

type Instantes = { desde: Date; hasta: Date };

/** Valida la configuración que manda el cliente (frontera de confianza). Los valores de filtros los vuelve a validar construirWhere contra el whitelist. */
export function validarConfigComparador(input: unknown): { ok: true; config: ConfigComparador } | { ok: false; error: string } {
  const error = (msg: string) => ({ ok: false as const, error: msg });
  if (!input || typeof input !== "object") return error("Configuración inválida.");
  const { metricas, periodos, desglose, proyectoIds } = input as Record<string, unknown>;

  if (!Array.isArray(metricas) || metricas.length === 0) return error("Agrega al menos una métrica.");
  if (metricas.length > MAX_METRICAS) return error(`Puedes comparar hasta ${MAX_METRICAS} métricas.`);
  if (!Array.isArray(periodos) || periodos.length < MIN_PERIODOS || periodos.length > MAX_PERIODOS) {
    return error(`Elige de ${MIN_PERIODOS} a ${MAX_PERIODOS} periodos.`);
  }
  if (desglose !== "ninguno" && desglose !== "proyecto" && desglose !== "unidad") return error("Desglose inválido.");
  if (proyectoIds !== undefined && (!Array.isArray(proyectoIds) || proyectoIds.some((p) => typeof p !== "string"))) {
    return error("Proyectos inválidos.");
  }

  const periodosOk: PeriodoComparador[] = [];
  for (const p of periodos) {
    const { desde, hasta, atajo } = (p ?? {}) as Record<string, unknown>;
    if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) {
      return error("Revisa las fechas: en cada periodo «desde» debe ser anterior o igual a «hasta».");
    }
    periodosOk.push(typeof atajo === "string" && Object.hasOwn(ATAJO_LABEL, atajo) ? { desde, hasta, atajo: atajo as AtajoPeriodo } : { desde, hasta });
  }

  const metricasOk: MetricaComparador[] = [];
  for (const m of metricas) {
    const r = (m ?? {}) as Record<string, unknown>;
    const nombre = typeof r.nombre === "string" && r.nombre.trim() ? r.nombre.trim().slice(0, 120) : undefined;
    const reglasValor = validarReglasColor(r.reglasValor);
    const reglasCambio = validarReglasColor(r.reglasCambio);
    if (reglasValor === null || reglasCambio === null) return error("Las reglas de color de una métrica no son válidas.");
    if (r.tipo === "sla") {
      metricasOk.push({ tipo: "sla", nombre, reglasValor, reglasCambio });
      continue;
    }
    const dataset = DATASETS_COMPARABLES.find((d) => d.id === r.datasetId);
    const campo = dataset && typeof r.campoId === "string" ? obtenerCampo(dataset, r.campoId) : undefined;
    const agregacion = r.agregacion as TipoAgregacion;
    if (r.tipo !== "bi" || !dataset || !campo || !agregacionesDisponibles(campo).includes(agregacion)) {
      return error("Una de las métricas ya no es válida; quítala y vuelve a agregarla.");
    }
    const filtros: FiltroGuardable[] = (Array.isArray(r.filtros) ? r.filtros : [])
      .filter((f): f is { campoId: string; valores: unknown[] } => !!f && typeof f.campoId === "string" && Array.isArray(f.valores))
      .slice(0, MAX_FILTROS)
      .map((f) => ({ campoId: f.campoId, valores: f.valores.filter((v): v is string => typeof v === "string") }));
    metricasOk.push({ tipo: "bi", datasetId: dataset.id, campoId: campo.id, agregacion, filtros, nombre, reglasValor, reglasCambio });
  }

  return { ok: true, config: { metricas: metricasOk, periodos: periodosOk, desglose, proyectoIds: proyectoIds as string[] | undefined } };
}

export async function ejecutarComparador(config: ConfigComparador): Promise<ResultadoMetricaComparador[]> {
  const instantes = config.periodos.map((p) => ({ desde: parseFechaLocalMx(p.desde)!, hasta: finDelDiaMx(p.hasta)! }));
  const llavePeriodos = config.periodos.map((p) => `${p.desde}..${p.hasta}`).join("|");
  return Promise.all(
    config.metricas.map((m) =>
      m.tipo === "sla" ? ejecutarSla(m, instantes, config.desglose, config.proyectoIds) : ejecutarMetricaBI(m, instantes, llavePeriodos, config.desglose, config.proyectoIds)
    )
  );
}

async function ejecutarMetricaBI(
  m: Extract<MetricaComparador, { tipo: "bi" }>,
  periodos: Instantes[],
  llavePeriodos: string,
  desglose: Desglose,
  proyectoIds: string[] | undefined
): Promise<ResultadoMetricaComparador> {
  const dataset = obtenerDataset(m.datasetId)!;
  const campo = obtenerCampo(dataset, m.campoId)!;
  const campoDesglose = desglose === "ninguno" ? undefined : obtenerCampo(dataset, CAMPO_DESGLOSE[desglose]);
  const base = { nombre: nombreMetrica(m), sufijo: ejeYSufijo(m.agregacion, campo) };
  const aviso = desglose !== "ninguno" && !campoDesglose ? `«${dataset.label}» no se puede desglosar por ${desglose}; se muestra solo el total.` : undefined;
  const { condicion: alcance, llave: llaveAlcance } = await resolverAlcanceProyecto(dataset, proyectoIds);

  const { total, filas, truncado } = await cachearConsultaBI(
    dataset.id,
    ["comparador", campo.id, m.agregacion, campoDesglose?.id ?? "", llavePeriodos, JSON.stringify(m.filtros), llaveAlcance],
    async () => {
      const fecha = Prisma.raw(dataset.fechaActividadExpr!);
      const agregado = metricaExpr(m.agregacion, campo);
      const enPeriodo = periodos.map((p) => Prisma.sql`${fecha} BETWEEN ${p.desde} AND ${p.hasta}`);
      const columnas = enPeriodo.flatMap((cond, i) => [
        Prisma.sql`${agregado} FILTER (WHERE ${cond}) AS ${Prisma.raw(`v${i}`)}`,
        Prisma.sql`COUNT(*) FILTER (WHERE ${cond}) AS ${Prisma.raw(`n${i}`)}`,
      ]);
      const where = construirWhere(dataset, m.filtros, [alcance, Prisma.sql`(${Prisma.join(enPeriodo, " OR ")})`]);

      type FilaSql = Record<string, unknown> & { dim?: string | null; es_total?: number };
      // Sin registros en el periodo = null ("sin datos"), salvo en conteo, donde 0 es un dato real.
      const valores = (f: FilaSql) =>
        periodos.map((_, i) => {
          const n = Number(f[`n${i}`] ?? 0);
          const v = f[`v${i}`];
          if (m.agregacion === "conteo") return n;
          return n === 0 || v === null || v === undefined ? null : Number(v);
        });

      if (!campoDesglose) {
        const [fila] = await prisma.$queryRaw<FilaSql[]>(Prisma.sql`SELECT ${Prisma.join(columnas, ", ")} FROM ${Prisma.raw(dataset.from)} ${where}`);
        return { total: valores(fila ?? {}), filas: [] as FilaComparador[], truncado: false };
      }

      const dim = campoExpr(campoDesglose);
      const filasSql = await prisma.$queryRaw<FilaSql[]>(Prisma.sql`
        SELECT ${dim} AS dim, GROUPING(${dim}) AS es_total, ${Prisma.join(columnas, ", ")}
        FROM ${Prisma.raw(dataset.from)}
        ${where}
        GROUP BY GROUPING SETS ((${dim}), ())
        ORDER BY es_total DESC, v0 DESC NULLS LAST, dim
        LIMIT ${MAX_FILAS_DESGLOSE + 2}
      `);
      const totalSql = filasSql.find((f) => Number(f.es_total) === 1);
      const grupos = filasSql.filter((f) => Number(f.es_total) !== 1).map((f) => ({ label: String(f.dim ?? "—"), valores: valores(f) }));
      return { total: valores(totalSql ?? {}), filas: grupos.slice(0, MAX_FILAS_DESGLOSE), truncado: grupos.length > MAX_FILAS_DESGLOSE };
    }
  );

  return { ...base, total, filas, truncado, aviso };
}

const promedio1 = (v: number[]) => (v.length === 0 ? null : Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10);

/** Disponibilidad: promedio simple del % de cada unidad con historial en el periodo (mismo criterio que el SLA mensual por proyecto). */
async function ejecutarSla(
  m: Extract<MetricaComparador, { tipo: "sla" }>,
  periodos: Instantes[],
  desglose: Desglose,
  proyectoIds: string[] | undefined
): Promise<ResultadoMetricaComparador> {
  const ids = await proyectosEfectivos(proyectoIds);
  const unidades = await prisma.unidad.findMany({
    where: ids === null ? {} : { proyectoId: { in: ids } },
    select: { numeroEconomico: true, proyecto: { select: { nombre: true } } },
  });
  // El historial no tiene futuro: un periodo que termina hoy se corta en "ahora" (si no, las horas que faltan contarían como disponibles).
  const ahora = new Date();
  const rangos = periodos.map((p) => ({ desde: p.desde, hasta: p.hasta < ahora ? p.hasta : ahora }));
  const porRango = await calcularSlaPorUnidadesEnRangos(
    unidades.map((u) => u.numeroEconomico),
    rangos
  );
  const valoresDe = (numeros: string[]) =>
    porRango.map((sla) => promedio1(numeros.map((n) => sla.get(n)?.porcentaje).filter((p): p is number => p !== null && p !== undefined)));

  const grupos = new Map<string, string[]>();
  if (desglose !== "ninguno") {
    for (const u of unidades) {
      const clave = desglose === "proyecto" ? u.proyecto?.nombre ?? "Sin proyecto" : u.numeroEconomico;
      const lista = grupos.get(clave) ?? [];
      lista.push(u.numeroEconomico);
      grupos.set(clave, lista);
    }
  }
  // Peor disponibilidad primero (en el periodo base): con el tope de filas, ordenar de mayor a menor dejaría ver solo unidades al 100%.
  const filas = [...grupos]
    .map(([label, numeros]) => ({ label, valores: valoresDe(numeros) }))
    .filter((f) => f.valores.some((v) => v !== null))
    .sort((a, b) => (a.valores[0] ?? 101) - (b.valores[0] ?? 101) || a.label.localeCompare(b.label));

  return {
    nombre: nombreMetrica(m),
    sufijo: "%",
    total: valoresDe(unidades.map((u) => u.numeroEconomico)),
    filas: filas.slice(0, MAX_FILAS_DESGLOSE),
    truncado: filas.length > MAX_FILAS_DESGLOSE,
    aviso: desglose === "proyecto" ? "La disponibilidad por proyecto agrupa cada unidad en su proyecto actual." : undefined,
  };
}
