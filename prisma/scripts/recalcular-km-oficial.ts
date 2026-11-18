// Recalcula Unidad.kmOficial de todas las unidades (no BAJA) con la regla de
// src/lib/km-oficial.ts. Por defecto solo simula e imprime el resumen; con
// --aplicar guarda los cambios. Uso:
//   npx tsx prisma/scripts/recalcular-km-oficial.ts [--aplicar] [--detalle]
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { recalcularKmOficial } from "../../src/lib/km-oficial-datos";

const aplicar = process.argv.includes("--aplicar");
const fecha = (d: Date | undefined) => (d ? d.toISOString().slice(0, 10) : "—");

async function main() {
  const unidades = await prisma.unidad.findMany({ where: { estatus: { not: "BAJA" } }, select: { numeroEconomico: true }, orderBy: { numeroEconomico: "asc" } });
  const { filas, cambios } = await recalcularKmOficial(unidades.map((u) => u.numeroEconomico), aplicar);

  const porFuente = new Map<string, number>();
  for (const f of filas) porFuente.set(f.oficial?.fuente ?? "SIN DATO (se conserva)", (porFuente.get(f.oficial?.fuente ?? "SIN DATO (se conserva)") ?? 0) + 1);
  const discrepancias = filas.filter((f) => f.discrepancia);

  console.log(`${aplicar ? "APLICADO" : "SIMULACIÓN (sin --aplicar no se escribe nada)"} — ${filas.length} unidades`);
  console.log(`Fuente del km oficial: ${[...porFuente].map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
  console.log(`Cambian: ${cambios.length} · Con discrepancia en el último checklist: ${discrepancias.length}`);

  console.log("\nTop 20 diferencias (actual → nuevo):");
  for (const c of [...cambios].sort((a, b) => Math.abs(b.oficial!.km - b.actual) - Math.abs(a.oficial!.km - a.actual)).slice(0, 20)) {
    console.log(`  ${c.numeroEconomico.padEnd(7)} ${String(c.actual).padStart(7)} → ${String(c.oficial!.km).padStart(7)}  (${(c.oficial!.km - c.actual > 0 ? "+" : "") + (c.oficial!.km - c.actual)})  ${c.oficial!.fuente} ${fecha(c.oficial!.fecha)}`);
  }

  console.log("\nDiscrepancias (último checklist descartado):");
  for (const d of discrepancias) {
    const ck = d.lecturas.checklists[0];
    console.log(
      `  ${d.numeroEconomico.padEnd(7)} checklist ${ck.km} (${fecha(ck.fecha)}) · carga ${d.lecturas.carga?.km ?? "—"} (${fecha(d.lecturas.carga?.fecha)}) · GPS ${d.lecturas.gps?.km ?? "—"} → ${d.oficial ? `usa ${d.oficial.km} (${d.oficial.fuente} ${fecha(d.oficial.fecha)})` : `se conserva ${d.actual}`}`
    );
  }

  if (process.argv.includes("--detalle")) {
    console.log("\nDetalle:");
    for (const f of filas) console.log(`  ${f.numeroEconomico.padEnd(7)} ${String(f.actual).padStart(7)} → ${f.oficial ? `${f.oficial.km} ${f.oficial.fuente} ${fecha(f.oficial.fecha)}` : "sin cambio"}${f.discrepancia ? "  ⚠ discrepancia" : ""}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
