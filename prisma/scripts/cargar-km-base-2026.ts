// Base del km 2026 por unidad (KmBaseAnual), punto de partida del comparativo
// "km recorridos en el año". Toma la primera lectura confiable desde el
// 1-ene-2026 (cargas del estado de cuenta con km y checklists, ver
// primeraLecturaConfiable en src/lib/km-oficial.ts); si la unidad no tiene
// lectura en enero usa la primera posterior y la marca. Desde 2027 la base la
// crea sola el cron de GPS. Con --archivo, el km al 1-ene del Excel de Control
// Vehicular (columnas: N° económico, placas, km; "SIN REGISTRO" = sin dato) manda
// sobre lo calculado. Por defecto solo simula; con --aplicar inserta (no
// pisa bases ya cargadas). Uso:
//   npx tsx prisma/scripts/cargar-km-base-2026.ts [--archivo <ruta.xlsx>] [--aplicar] [--detalle]
import "dotenv/config";
import * as XLSX from "xlsx";
import { prisma } from "../../src/lib/prisma";
import { Prisma } from "../../src/generated/prisma/client";
import { primeraLecturaConfiable, cuadran, type Lectura } from "../../src/lib/km-oficial";
import { ODOMETRO_CHECKLIST, recalcularKmOficial } from "../../src/lib/km-oficial-datos";

const ANIO = 2026;
const INICIO = new Date("2026-01-01T06:00:00Z"); // medianoche MX
const FIN_ENERO = new Date("2026-02-01T06:00:00Z");
const aplicar = process.argv.includes("--aplicar");
const dia = (d: Date) => d.toISOString().slice(0, 10);
const iArchivo = process.argv.indexOf("--archivo");
const archivo = iArchivo > 0 ? process.argv[iArchivo + 1] : null;

/** N° económico → km al 1-ene del Excel; solo las celdas numéricas ("SIN REGISTRO" queda fuera). */
function leerArchivo(ruta: string): Map<string, number> {
  const wb = XLSX.readFile(ruta);
  const filas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: true }).slice(1);
  return new Map(filas.filter((r) => r[0] && typeof r[2] === "number" && r[2] >= 0).map((r) => [String(r[0]).trim(), Math.round(r[2] as number)]));
}

type Fila = { numeroEconomico: string; fecha: Date; km: number; fuente: "CARGA" | "CHECKLIST" };

async function main() {
  const unidades = await prisma.unidad.findMany({ where: { estatus: { not: "BAJA" } }, select: { numeroEconomico: true }, orderBy: { numeroEconomico: "asc" } });
  const numeros = unidades.map((u) => u.numeroEconomico);
  const filas = await prisma.$queryRaw<Fila[]>(Prisma.sql`
    SELECT "numeroEconomico", fecha, "kmActual" AS km, 'CARGA' AS fuente FROM "Combustible"
    WHERE "numeroEconomico" IN (${Prisma.join(numeros)}) AND fecha >= ${INICIO} AND "kmActual" > 0
    UNION ALL
    SELECT "numeroEconomico", fecha, ${ODOMETRO_CHECKLIST}, 'CHECKLIST' FROM "Checklist"
    WHERE "numeroEconomico" IN (${Prisma.join(numeros)}) AND fecha >= ${INICIO} AND tipo IN ('DIARIO', 'SEMANAL') AND ${ODOMETRO_CHECKLIST} > 0
  `);

  const porUnidad = new Map<string, (Lectura & { fuente: string })[]>(numeros.map((n) => [n, []]));
  for (const f of filas) porUnidad.get(f.numeroEconomico)?.push({ km: f.km, fecha: f.fecha, gps: null, fuente: f.fuente });

  // Km actual con la regla del km oficial (lo que quedará tras recalcular-km-oficial.ts), para mostrar km recorridos 2026.
  const { filas: oficiales } = await recalcularKmOficial(numeros, false);
  const oficialPor = new Map(oficiales.map((o) => [o.numeroEconomico, o]));
  const kmActual = new Map(oficiales.map((o) => [o.numeroEconomico, o.oficial?.km ?? o.actual]));

  const kmArchivo = archivo ? leerArchivo(archivo) : new Map<string, number>();
  const ajenas = [...kmArchivo.keys()].filter((n) => !numeros.includes(n));
  if (archivo) console.log(`Archivo: ${kmArchivo.size} unidades con km al 1-ene${ajenas.length ? ` · no existen o están de baja en Orión (se ignoran): ${ajenas.join(", ")}` : ""}`);

  const propuestas = numeros.map((n) => {
    const lecturas = porUnidad.get(n)!;
    const kmEnero = kmArchivo.get(n);
    const base = (kmEnero != null
      ? { km: kmEnero, fecha: INICIO, gps: null, fuente: "ARCHIVO" }
      : primeraLecturaConfiable(lecturas)) as (Lectura & { fuente: string }) | null;
    const enEnero = lecturas.filter((l) => l.fecha < FIN_ENERO).length;
    const oficial = oficialPor.get(n)?.oficial;
    // Una base que no cuadra con el km actual (más km que hoy, o más de 1,000 km/día) es un dato basura del estado de cuenta: no se inserta.
    const cuadraConActual = !base || !oficial || cuadran({ ...base, gps: null }, { ...oficial, gps: null });
    return { n, base, enEnero, cuadraConActual, recorrido: base ? kmActual.get(n)! - base.km : null };
  });
  const enero = propuestas.filter((p) => p.base && p.base.fecha < FIN_ENERO);
  const posteriores = propuestas.filter((p) => p.base && p.base.fecha >= FIN_ENERO);
  const sinDato = propuestas.filter((p) => !p.base);

  console.log(`${aplicar ? "APLICADO" : "SIMULACIÓN (sin --aplicar no se escribe nada)"} — base ${ANIO} para ${numeros.length} unidades`);
  console.log(`Con lectura en enero: ${enero.length} · Primera lectura posterior a enero (marcadas): ${posteriores.length} · Sin ninguna lectura en ${ANIO}: ${sinDato.length}`);
  console.log(`Lecturas en enero por unidad: ${enero.length ? `mediana ${enero.map((p) => p.enEnero).sort((a, b) => a - b)[Math.floor(enero.length / 2)]}` : "—"} · fuentes de la base: ${[...new Set(propuestas.map((p) => p.base?.fuente).filter(Boolean))].join(", ")}`);
  const porMes = new Map<string, number>();
  for (const p of posteriores) porMes.set(dia(p.base!.fecha).slice(0, 7), (porMes.get(dia(p.base!.fecha).slice(0, 7)) ?? 0) + 1);
  console.log(`Mes de la base de las posteriores: ${[...porMes].sort().map(([m, c]) => `${m}: ${c}`).join(" · ")}`);

  const raros = propuestas.filter((p) => !p.cuadraConActual);
  console.log(`\nBases que no cuadran con el km actual (NO se insertan, revisar a mano): ${raros.length}`);
  for (const p of raros) console.log(`  ${p.n.padEnd(7)} base ${p.base!.km} (${p.base!.fuente} ${dia(p.base!.fecha)}) · actual ${kmActual.get(p.n)} → ${p.recorrido}`);

  console.log(`\nPosteriores a enero:`);
  for (const p of posteriores) console.log(`  ${p.n.padEnd(7)} ${String(p.base!.km).padStart(7)} ${p.base!.fuente.padEnd(9)} ${dia(p.base!.fecha)}`);
  console.log(`\nSin ninguna lectura en ${ANIO}: ${sinDato.map((p) => p.n).join(", ") || "—"}`);

  if (process.argv.includes("--detalle")) {
    console.log(`\nDetalle (base · km actual · recorrido ${ANIO}):`);
    for (const p of propuestas.filter((x) => x.base)) {
      console.log(`  ${p.n.padEnd(7)} ${String(p.base!.km).padStart(7)} ${p.base!.fuente.padEnd(9)} ${dia(p.base!.fecha)}${p.base!.fecha >= FIN_ENERO ? " *" : "  "}${p.cuadraConActual ? " " : "!"} · ${String(kmActual.get(p.n)).padStart(7)} · ${p.recorrido}`);
    }
  }

  // Con archivo, "SIN REGISTRO" solo se completa con una lectura de enero: una base de otro mes no es la de enero.
  const insertables = propuestas.filter((p) => p.base && p.cuadraConActual && (!archivo || p.base.fecha < FIN_ENERO));
  const porFuente = new Map<string, number>();
  for (const p of insertables) porFuente.set(p.base!.fuente, (porFuente.get(p.base!.fuente) ?? 0) + 1);
  console.log(`\nSe insertarían ${insertables.length} bases: ${[...porFuente].map(([f, c]) => `${f} ${c}`).join(" · ")}`);
  console.log(`Sin base ${ANIO}: ${propuestas.filter((p) => !insertables.includes(p)).map((p) => p.n).join(", ")}`);

  if (aplicar) {
    const { count } = await prisma.kmBaseAnual.createMany({
      data: insertables.map((p) => ({ numeroEconomico: p.n, anio: ANIO, km: p.base!.km, fuente: p.base!.fuente, fecha: p.base!.fecha })),
      skipDuplicates: true,
    });
    console.log(`\nInsertadas: ${count} (las que ya tenían base ${ANIO} no se tocaron).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
