// Corrige la fecha de checklists de Carga de Combustible guardados con fecha equivocada
// por dos fallas del wizard (corregidas en wizard-carga-combustible.tsx):
//  1. Capturados después de las 18:00 MX quedaban con fecha de MAÑANA (día UTC).
//  2. Un borrador abandonado días antes rescataba su fecha vieja en la carga nueva; se
//     corrige solo si hay una transacción de la misma unidad con los mismos litros/importe
//     (±1 L / ±$2) el día de captura o el anterior, y ningún otro checklist ya la cubre.
// Además lista los checklists con litros/importe que dan un $/L imposible y corrige los de MONTOS_CORREGIDOS
// (revisados uno a uno contra la transacción Efectivale el 2026-11-18; solo si el valor guardado sigue igual).
// Con --aplicar guarda antes un respaldo JSON de fecha y respuestas originales en prisma/scripts/.tmp/.
// Uso: npx tsx prisma/scripts/corregir-fechas-checklist-combustible.ts            (dry-run, no escribe)
//      npx tsx prisma/scripts/corregir-fechas-checklist-combustible.ts --aplicar  (escribe)
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";
import { parseFechaLocalMx } from "../../src/lib/timezone";
import { PRECIO_LITRO_MIN, PRECIO_LITRO_MAX } from "../../src/lib/checklist-carga-combustible-alertas";

const APLICAR = process.argv.includes("--aplicar");
const diaMx = (d: Date) => new Date(d.getTime() - 6 * 3_600_000).toISOString().slice(0, 10);
const dias = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
const cerca = (a: number, b: number, tol: number) => Math.abs(Math.round(a * 100) - Math.round(b * 100)) <= tol * 100;

// Sufijo del id → valores guardados (guarda) y corregidos. Decimal corrido, precio/L tecleado como litros,
// litros e importe invertidos o un dígito perdido; el valor correcto sale de la transacción del mismo día.
const MONTOS_CORREGIDOS: { id: string; ne: string; antes: [number, number]; despues: [number, number] }[] = [
  { id: "10pq8ldq", ne: "G5-015", antes: [28500, 769.5], despues: [28.5, 769.5] },
  { id: "n9h7d636", ne: "C5-054", antes: [30976, 734.13], despues: [30.976, 734.13] },
  { id: "hmtma0ar", ne: "G5-014", antes: [26.95, 1299.8], despues: [48.23, 1299.8] },
  { id: "071umdvo", ne: "CS-007", antes: [1566.08, 58], despues: [58, 1566.08] },
  { id: "9ygywyea", ne: "C5-038", antes: [23.99, 1001.1], despues: [41.73, 1001.1] },
  { id: "tamdgxp1", ne: "CR-024", antes: [70.74, 1.90927], despues: [70.74, 1909.27] },
  { id: "4zk7lcuw", ne: "G5-025", antes: [41.2, 112.13], despues: [41.2, 1112.13] },
  { id: "xr3kk3p2", ne: "C5-064", antes: [37050, 1000], despues: [37.05, 1000] },
  { id: "hk1yide4", ne: "G5-015", antes: [5187, 1400], despues: [51.87, 1400] },
  { id: "bdjny2jh", ne: "CS-006", antes: [87.53, 900], despues: [37.52, 900] },
  { id: "e1pyiq1h", ne: "C5-051", antes: [55.56, 1.30955], despues: [55.56, 1309.55] },
  { id: "e3fo5g9i", ne: "CS-002", antes: [77, 1.84723], despues: [77, 1847.23] },
  { id: "uedvei9x", ne: "CS-006", antes: [3751, 900], despues: [37.51, 900] },
];

async function main() {
  const checklists = await prisma.checklist.findMany({
    where: { tipo: "CARGA_COMBUSTIBLE" },
    select: { id: true, numeroEconomico: true, fecha: true, createdAt: true, respuestasSemanal: true },
  });
  const transacciones = await prisma.combustible.findMany({
    where: { numeroEconomico: { in: [...new Set(checklists.map((c) => c.numeroEconomico))] } },
    select: { numeroEconomico: true, fecha: true, litros: true, costo: true },
  });
  const montos = (c: (typeof checklists)[number]) => {
    const r = (c.respuestasSemanal ?? {}) as Record<string, string>;
    return { litros: Number(r.litros_cargados), importe: Number(r.cantidad_pagada) };
  };
  const coincide = (c: (typeof checklists)[number], t: (typeof transacciones)[number]) => {
    const m = montos(c);
    return cerca(m.litros, Number(t.litros), 1) && cerca(m.importe, Number(t.costo), 2);
  };

  const cambios: { id: string; ne: string; de: string; a: string; motivo: string }[] = [];
  for (const c of checklists) {
    const fecha = diaMx(c.fecha), creado = diaMx(c.createdAt);
    if (fecha > creado) {
      cambios.push({ id: c.id, ne: c.numeroEconomico, de: fecha, a: creado, motivo: "fecha futura (UTC)" });
      continue;
    }
    if (dias(creado, fecha) < 2 || !montos(c).litros) continue;
    const propias = transacciones.filter((t) => t.numeroEconomico === c.numeroEconomico && coincide(c, t));
    if (propias.some((t) => Math.abs(dias(diaMx(t.fecha), fecha)) <= 1)) continue; // su fecha ya cuadra con una transacción
    const tx = propias.find((t) => { const d = dias(creado, diaMx(t.fecha)); return d >= 0 && d <= 1; });
    if (!tx) continue;
    const diaTx = diaMx(tx.fecha);
    const yaCubierta = checklists.some((o) => o.id !== c.id && o.numeroEconomico === c.numeroEconomico && Math.abs(dias(diaMx(o.fecha), diaTx)) <= 1 && coincide(o, tx));
    if (!yaCubierta) cambios.push({ id: c.id, ne: c.numeroEconomico, de: fecha, a: diaTx, motivo: `borrador viejo (capturado ${creado})` });
  }

  console.table(cambios.map(({ id, ...r }) => ({ id: id.slice(-8), ...r })));
  console.log(`${cambios.length} checklists con fecha a corregir.`);

  const montosImposibles = checklists
    .map((c) => ({ c, ...montos(c) }))
    .filter(({ litros, importe }) => litros > 0 && importe > 0 && (importe / litros < PRECIO_LITRO_MIN || importe / litros > PRECIO_LITRO_MAX))
    .map(({ c, litros, importe }) => {
      const tx = transacciones.find((t) => t.numeroEconomico === c.numeroEconomico && Math.abs(dias(diaMx(t.fecha), diaMx(c.fecha))) <= 1 && (cerca(litros, Number(t.litros), 1) || cerca(importe, Number(t.costo), 2) || cerca(litros, Number(t.costo), 2)));
      return { id: c.id.slice(-8), ne: c.numeroEconomico, fecha: diaMx(c.fecha), litros, importe, "$/L": (importe / litros).toFixed(2), txLitros: tx ? Number(tx.litros) : "", txImporte: tx ? Number(tx.costo) : "" };
    });
  console.log(`\n${montosImposibles.length} checklists con $/L fuera de ${PRECIO_LITRO_MIN}–${PRECIO_LITRO_MAX}:`);
  console.table(montosImposibles);

  // Montos: cada corrección debe encontrar exactamente un checklist con esos valores todavía guardados.
  const montosACorregir = MONTOS_CORREGIDOS.flatMap((m) => {
    const c = checklists.filter((k) => k.id.endsWith(m.id) && k.numeroEconomico === m.ne);
    const actual = c.length === 1 ? montos(c[0]) : null;
    if (!actual || actual.litros !== m.antes[0] || actual.importe !== m.antes[1]) {
      console.log(`Monto omitido ${m.ne} …${m.id}: ya no coincide con lo esperado (${JSON.stringify(actual)}).`);
      return [];
    }
    return [{ ...m, id: c[0].id }];
  });
  console.log(`\n${montosACorregir.length} de ${MONTOS_CORREGIDOS.length} montos a corregir:`);
  console.table(montosACorregir.map((m) => ({ id: m.id.slice(-8), ne: m.ne, antes: m.antes.join(" L / $"), despues: m.despues.join(" L / $"), "$/L": (m.despues[1] / m.despues[0]).toFixed(2) })));

  if (!APLICAR) {
    console.log("\nDry-run: no se escribió nada. Corre con --aplicar para guardar fechas y montos.");
    return;
  }
  const tocados = new Set([...cambios.map((x) => x.id), ...montosACorregir.map((m) => m.id)]);
  const respaldo = checklists.filter((c) => tocados.has(c.id)).map(({ id, fecha, respuestasSemanal }) => ({ id, fecha, respuestasSemanal }));
  mkdirSync("prisma/scripts/.tmp", { recursive: true });
  const archivo = `prisma/scripts/.tmp/respaldo-checklist-combustible-${Date.now()}.json`;
  writeFileSync(archivo, JSON.stringify(respaldo, null, 2));
  console.log(`Respaldo de ${respaldo.length} checklists en ${archivo}`);

  for (const id of tocados) {
    const c = checklists.find((k) => k.id === id)!;
    const r = { ...(c.respuestasSemanal as Record<string, unknown>) };
    const f = cambios.find((x) => x.id === id);
    const m = montosACorregir.find((x) => x.id === id);
    if (f) r.fecha = f.a;
    // Respeta el tipo guardado (texto o número) del JSON original.
    const conTipo = (orig: unknown, v: number) => (typeof orig === "number" ? v : String(v));
    if (m) {
      r.litros_cargados = conTipo(r.litros_cargados, m.despues[0]);
      r.cantidad_pagada = conTipo(r.cantidad_pagada, m.despues[1]);
    }
    await prisma.checklist.update({
      where: { id },
      data: { ...(f ? { fecha: parseFechaLocalMx(f.a)! } : {}), respuestasSemanal: r as object },
    });
  }
  console.log(`${cambios.length} fechas y ${montosACorregir.length} montos corregidos (${tocados.size} checklists).`);
}

main().finally(() => prisma.$disconnect());
