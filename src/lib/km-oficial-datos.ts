// Lecturas de odómetro por unidad (checklists, última carga, GPS) para la regla
// de src/lib/km-oficial.ts, y el recálculo de Unidad.kmOficial. Una sola
// consulta para todas las unidades pedidas — nunca una por unidad (ver
// incidente de cuota de Neon por N+1).
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { resolverKmOficial, type LecturasKm, type ResultadoKmOficial } from "@/lib/km-oficial";
import { inicioDeAnioMx } from "@/lib/timezone";

/** Odómetro de un checklist: el diario lo trae en `odometro`; el semanal, como texto en respuestasSemanal.gen_odometro (a veces con decimales). */
export const ODOMETRO_CHECKLIST = Prisma.sql`COALESCE(odometro, CASE WHEN "respuestasSemanal"->>'gen_odometro' ~ '^[0-9]+([.][0-9]+)?$'
  THEN round(("respuestasSemanal"->>'gen_odometro')::numeric)::int END)`;

type FilaLectura = { fuente: "CHECKLIST" | "CARGA" | "GPS"; numeroEconomico: string; fecha: Date; km: number; gps: number | null };

export async function cargarLecturasKm(numeros: string[]): Promise<Map<string, LecturasKm>> {
  const resultado = new Map(numeros.map((n): [string, LecturasKm] => [n, { checklists: [], carga: null, gps: null }]));
  if (numeros.length === 0) return resultado;
  const en = Prisma.join(numeros);

  // GPS "a esa hora" = última lectura validada del día previo a la lectura; sin ella, null.
  const filas = await prisma.$queryRaw<FilaLectura[]>(Prisma.sql`
    WITH ck AS (
      SELECT "numeroEconomico", fecha, ${ODOMETRO_CHECKLIST} AS km
      FROM "Checklist"
      WHERE "numeroEconomico" IN (${en}) AND tipo IN ('DIARIO', 'SEMANAL')
    ), ultimos AS (
      SELECT *, row_number() OVER (PARTITION BY "numeroEconomico" ORDER BY fecha DESC) AS rn FROM ck WHERE km > 0
    ), lecturas AS (
      SELECT 'CHECKLIST' AS fuente, "numeroEconomico", fecha, km FROM ultimos WHERE rn <= 5
      UNION ALL
      SELECT * FROM (
        SELECT DISTINCT ON ("numeroEconomico") 'CARGA' AS fuente, "numeroEconomico", fecha, "kmActual" AS km
        FROM "Combustible" WHERE "numeroEconomico" IN (${en}) AND "kmActual" > 0
        ORDER BY "numeroEconomico", fecha DESC
      ) cg
    )
    SELECT l.fuente, l."numeroEconomico", l.fecha, l.km, g."kmValidado" AS gps
    FROM lecturas l
    LEFT JOIN LATERAL (
      SELECT "kmValidado" FROM "PosicionGPS" p
      WHERE p."numeroEconomico" = l."numeroEconomico" AND p."kmValidado" IS NOT NULL
        AND p.timestamp <= l.fecha AND p.timestamp > l.fecha - interval '1 day'
      ORDER BY p.timestamp DESC LIMIT 1
    ) g ON true
    UNION ALL
    SELECT 'GPS', u."numeroEconomico", g.timestamp, g."kmValidado", g."kmValidado"
    FROM "Unidad" u
    CROSS JOIN LATERAL (
      SELECT timestamp, "kmValidado" FROM "PosicionGPS" p
      WHERE p."numeroEconomico" = u."numeroEconomico" AND p."kmValidado" IS NOT NULL
      ORDER BY p.timestamp DESC LIMIT 1
    ) g
    WHERE u."numeroEconomico" IN (${en})
  `);

  for (const f of filas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())) {
    const l = resultado.get(f.numeroEconomico);
    if (!l) continue;
    const lectura = { km: f.km, fecha: f.fecha, gps: f.gps };
    if (f.fuente === "CHECKLIST") l.checklists.push(lectura);
    else if (f.fuente === "CARGA") l.carga = lectura;
    else l.gps = lectura;
  }
  return resultado;
}

export type FilaKmOficial = { numeroEconomico: string; actual: number; lecturas: LecturasKm } & ResultadoKmOficial;

/**
 * Aplica la regla a las unidades pedidas y, con `aplicar`, guarda en un solo
 * UPDATE las que cambian. Devuelve todas las filas (para reportar) y los cambios.
 */
export async function recalcularKmOficial(numeros: string[], aplicar: boolean): Promise<{ filas: FilaKmOficial[]; cambios: FilaKmOficial[] }> {
  const [lecturas, unidades] = await Promise.all([
    cargarLecturasKm(numeros),
    prisma.unidad.findMany({ where: { numeroEconomico: { in: numeros } }, select: { numeroEconomico: true, kmOficial: true } }),
  ]);
  const filas = unidades.map((u): FilaKmOficial => {
    const l = lecturas.get(u.numeroEconomico)!;
    return { numeroEconomico: u.numeroEconomico, actual: u.kmOficial, lecturas: l, ...resolverKmOficial(l) };
  });
  const cambios = filas.filter((f) => f.oficial && f.oficial.km !== f.actual);

  if (aplicar && cambios.length > 0) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "Unidad" AS u SET "kmOficial" = c.km
      FROM (VALUES ${Prisma.join(cambios.map((c) => Prisma.sql`(${c.numeroEconomico}::text, ${c.oficial!.km}::int)`))}) AS c("numeroEconomico", km)
      WHERE u."numeroEconomico" = c."numeroEconomico"
    `);
  }
  return { filas, cambios };
}

// shortcut: 2026 no se autogenera (su base sale de las cargas de enero con su script); si se pierde ese script, bajar a 2026 crearía la base con el km de hoy.
const PRIMER_ANIO_AUTOMATICO = 2027;

/**
 * Base del km del año en curso (KmBaseAnual) con el km oficial vigente, para las
 * unidades que aún no la tengan. Corre en el cron de GPS: el 1-ene a las 00:00–00:10
 * toma el km oficial al cierre del 31-dic; una unidad dada de alta en el año toma
 * su primer km oficial. Casi siempre no inserta nada.
 */
export async function asegurarBaseAnual(): Promise<number> {
  const anio = inicioDeAnioMx().getUTCFullYear();
  if (anio < PRIMER_ANIO_AUTOMATICO) return 0;
  const sinBase = await prisma.unidad.findMany({
    where: { estatus: { not: "BAJA" }, kmOficial: { gt: 0 }, kmBasesAnuales: { none: { anio } } },
    select: { numeroEconomico: true, kmOficial: true },
  });
  if (sinBase.length === 0) return 0;
  const fecha = new Date();
  const { count } = await prisma.kmBaseAnual.createMany({
    data: sinBase.map((u) => ({ numeroEconomico: u.numeroEconomico, anio, km: u.kmOficial, fuente: "KM_OFICIAL", fecha })),
    skipDuplicates: true,
  });
  return count;
}
